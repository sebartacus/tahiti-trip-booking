import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getCharterSlotRequirements,
  isCharterFormula,
  isValidIsoDate,
} from "@/lib/charter-availability";
import {
  getCharterPaymentAmounts,
  getCharterPrice,
  validateCharterBooking,
  type CharterPaymentType,
  type SunsetDrink,
} from "@/lib/charter-pricing";

type ReservationBody = {
  formule?: unknown;
  date_debut?: unknown;
  nombre_personnes?: unknown;
  responsable_prenom?: unknown;
  responsable_nom?: unknown;
  responsable_email?: unknown;
  responsable_tel?: unknown;
  sunset_drink?: unknown;
  champagne_supplement?: unknown;
  type_paiement?: unknown;
  sleeping_arrangement_accepted?: unknown;
  conditions_accepted?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function todayTahiti() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Tahiti",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configuration Supabase Charter manquante.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: Request) {
  let body: ReservationBody;
  try {
    body = (await request.json()) as ReservationBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const formula = body.formule;
  const startDate = body.date_debut;
  const participants = Number(body.nombre_personnes);
  const firstName = text(body.responsable_prenom);
  const lastName = text(body.responsable_nom);
  const email = text(body.responsable_email);
  const phone = text(body.responsable_tel);
  const paymentType = body.type_paiement;
  const sleepingAccepted = body.sleeping_arrangement_accepted === true;
  const conditionsAccepted = body.conditions_accepted === true;
  const champagneSupplement = body.champagne_supplement === true;
  const sunsetDrink = body.sunset_drink;

  if (!isCharterFormula(formula)) {
    return NextResponse.json({ error: "Formule Charter invalide." }, { status: 400 });
  }
  if (!isValidIsoDate(startDate) || startDate < todayTahiti()) {
    return NextResponse.json({ error: "Date de départ invalide ou passée." }, { status: 400 });
  }
  if (paymentType !== "deposit" && paymentType !== "full") {
    return NextResponse.json({ error: "Choix de paiement invalide." }, { status: 400 });
  }

  const validSunsetDrink = sunsetDrink === "white_wine" || sunsetDrink === "champagne_included";
  if (formula !== "sunset" && (sunsetDrink != null || champagneSupplement)) {
    return NextResponse.json({ error: "Option Sunset incohérente." }, { status: 400 });
  }
  if (formula === "sunset" && participants <= 2 && (!validSunsetDrink || champagneSupplement)) {
    return NextResponse.json({ error: "Choix de boisson Sunset invalide." }, { status: 400 });
  }
  if (formula === "sunset" && participants >= 3 && sunsetDrink !== "white_wine") {
    return NextResponse.json({ error: "Le vin blanc doit être sélectionné pour ce Sunset." }, { status: 400 });
  }

  const validationError = validateCharterBooking({
    formula,
    firstName,
    lastName,
    phone,
    email,
    participants,
    sunsetDrinkSelected: validSunsetDrink,
    sleepingAccepted,
    conditionsAccepted,
  });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const total = getCharterPrice(formula, participants, champagneSupplement);
  const payment = getCharterPaymentAmounts(total, paymentType as CharterPaymentType);
  const { endDate, requiredSlots } = getCharterSlotRequirements(formula, startDate);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  let supabase;
  try {
    supabase = getAdminClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Configuration serveur indisponible." },
      { status: 500 }
    );
  }

  const insertion = await supabase
    .from("reservations_charter")
    .insert({
      date_debut: startDate,
      date_fin: endDate,
      formule: formula,
      nombre_personnes: participants,
      responsable_prenom: firstName,
      responsable_nom: lastName,
      responsable_email: email,
      responsable_tel: phone,
      montant_total: total,
      montant_paye: payment.amountToPay,
      montant_solde: payment.balance,
      type_paiement: paymentType,
      statut_paiement: "pending",
      paye: false,
      sunset_drink: formula === "sunset" ? (sunsetDrink as SunsetDrink) : null,
      champagne_supplement: formula === "sunset" ? champagneSupplement : false,
      sleeping_arrangement_accepted: sleepingAccepted,
      conditions_accepted: conditionsAccepted,
    })
    .select("id")
    .single();

  if (insertion.error || !insertion.data?.id) {
    return NextResponse.json(
      { error: "Impossible d’enregistrer la réservation Charter." },
      { status: 500 }
    );
  }

  const reservationId = String(insertion.data.id);
  const cleanup = async () => {
    const released = await supabase
      .from("boat_calendar_slots")
      .update({
        status: "available",
        activity: null,
        reservation_id: null,
        reservation_table: null,
        blocked_reason: null,
        blocked_by: null,
        blocked_at: null,
        expires_at: null,
      })
      .eq("status", "hold")
      .eq("activity", "charter")
      .eq("reservation_table", "reservations_charter")
      .eq("reservation_id", reservationId);
    if (released.error) return released.error;

    const deleted = await supabase
      .from("reservations_charter")
      .delete()
      .eq("id", reservationId);
    return deleted.error;
  };

  const hold = await supabase.rpc("acquire_charter_boat_holds", {
    p_reservation_id: reservationId,
    p_reservation_table: "reservations_charter",
    p_activity: "charter",
    p_requested_slots: requiredSlots,
    p_expires_at: expiresAt,
  });

  if (hold.error) {
    const cleanupError = await cleanup();
    return NextResponse.json(
      {
        error: cleanupError
          ? "Erreur de disponibilité et nettoyage incomplet. Contactez le support."
          : "Impossible de verrouiller temporairement les disponibilités.",
      },
      { status: 500 }
    );
  }

  const result = Array.isArray(hold.data) ? hold.data[0] : hold.data;
  if (!result?.success) {
    const cleanupError = await cleanup();
    if (cleanupError) {
      return NextResponse.json(
        { error: "Conflit de disponibilité et nettoyage incomplet. Contactez le support." },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Cette date vient d’être réservée. Merci de choisir une autre date." },
      { status: 409 }
    );
  }

  return NextResponse.json({
    success: true,
    reservation_id: reservationId,
    formula,
    date_debut: startDate,
    date_fin: endDate,
    montant_total: total,
    montant_a_payer: payment.amountToPay,
    montant_solde: payment.balance,
    hold_expires_at: result.hold_expires_at || expiresAt,
  });
}
