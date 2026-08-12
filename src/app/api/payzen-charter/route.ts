import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getCharterSlotRequirements } from "@/lib/charter-availability";
import {
  formatPayzenDate,
  getExpectedCharterPayment,
  getRequestBaseUrl,
  signPayzen,
} from "@/lib/charter-payment";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configuration Supabase Charter manquante.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const reservationId = typeof body.reservation_id === "string" ? body.reservation_id.trim() : "";
    if (!reservationId) return NextResponse.json({ error: "Identifiant de réservation manquant." }, { status: 400 });

    const supabase = adminClient();
    const query = await supabase.from("reservations_charter").select(
      "id,date_debut,formule,nombre_personnes,responsable_email,montant_total,montant_paye,montant_solde,type_paiement,statut_paiement,paye,champagne_supplement"
    ).eq("id", reservationId).maybeSingle();
    if (query.error || !query.data) return NextResponse.json({ error: "Réservation Charter introuvable." }, { status: 404 });
    const reservation = query.data;
    if (reservation.statut_paiement !== "pending" || reservation.paye) {
      return NextResponse.json({ error: "Cette réservation ne peut plus être payée." }, { status: 409 });
    }

    let payment;
    try {
      payment = getExpectedCharterPayment(reservation);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Réservation incohérente." }, { status: 409 });
    }

    const { requiredSlots } = getCharterSlotRequirements(payment.formula, String(reservation.date_debut));
    const holds = await supabase.from("boat_calendar_slots").select("date,slot,status,expires_at")
      .eq("reservation_id", reservationId).eq("reservation_table", "reservations_charter")
      .eq("activity", "charter").eq("status", "hold");
    const now = Date.now();
    const active = (holds.data || []).filter((hold) => hold.expires_at && new Date(hold.expires_at).getTime() > now);
    const activeKeys = new Set(active.map((hold) => `${hold.date}:${hold.slot}`));
    if (holds.error || active.length !== requiredSlots.length || requiredSlots.some((slot) => !activeKeys.has(`${slot.date}:${slot.slot}`))) {
      return NextResponse.json({ error: "Le maintien temporaire de cette date a expiré. Merci de choisir à nouveau votre date." }, { status: 409 });
    }

    const siteId = process.env.NEXT_PUBLIC_PAYZEN_SITE_ID;
    const productionKey = process.env.PAYZEN_PRODUCTION_KEY;
    const testKey = process.env.PAYZEN_TEST_KEY;
    const key = productionKey || testKey;
    const contextMode = productionKey ? "PRODUCTION" : "TEST";
    if (!siteId || !key) return NextResponse.json({ error: "Configuration PayZen manquante." }, { status: 500 });

    const baseUrl = getRequestBaseUrl(request);
    const fields: Record<string, string> = {
      vads_action_mode: "INTERACTIVE",
      vads_amount: String(payment.amountToPay),
      vads_ctx_mode: contextMode,
      vads_currency: "953",
      vads_cust_email: String(reservation.responsable_email),
      vads_ext_info_activity: "charter",
      vads_ext_info_reservation_id: reservationId,
      vads_ext_info_reservation_table: "reservations_charter",
      vads_order_id: reservationId,
      vads_page_action: "PAYMENT",
      vads_payment_config: "SINGLE",
      vads_site_id: siteId,
      vads_trans_date: formatPayzenDate(new Date()),
      vads_trans_id: Date.now().toString().slice(-6),
      vads_url_check: new URL("/api/payzen-notification-charter", baseUrl).toString(),
      vads_url_return: new URL(`/charter/success?reservationId=${encodeURIComponent(reservationId)}`, baseUrl).toString(),
      vads_version: "V2",
    };

    return NextResponse.json({
      url: "https://secure.payzen.eu/vads-payment/",
      champs: { ...fields, signature: signPayzen(fields, key) },
    });
  } catch (error) {
    console.error("Erreur préparation PayZen Charter :", error);
    return NextResponse.json({ error: "Impossible de préparer le paiement Charter." }, { status: 500 });
  }
}
