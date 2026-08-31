import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getBaleinesParticipantPrice, PUBLIC_PRICING_TYPE_SALON } from "@/lib/public-pricing";
import { createPaymentIntentToken } from "@/lib/payment-intent";

type Participant = { prenom?: unknown; nom?: unknown; age?: unknown; role?: unknown; materielPerso?: unknown; tailleCombinaison?: unknown; pointurePalmes?: unknown };
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configuration Supabase Baleines manquante.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (["montant", "montant_total", "amount", "price", "pricing_type"].some((key) => key in body)) return NextResponse.json({ error: "Le prix est déterminé exclusivement par le serveur." }, { status: 400 });
    const participants = Array.isArray(body.participants) ? body.participants as Participant[] : [];
    if (!participants.length || participants.length > 8) return NextResponse.json({ error: "Participants invalides." }, { status: 400 });
    const normalized = participants.map((participant) => {
      const age = Number(participant.age);
      const role = participant.role === "mise_eau" ? "mise_eau" as const : participant.role === "observateur" ? "observateur" as const : null;
      if (!text(participant.prenom) || !text(participant.nom) || !Number.isFinite(age) || age <= 0 || !role || (age < 12 && role === "mise_eau")) throw new Error("Participant invalide.");
      return { ...participant, prenom: text(participant.prenom), nom: text(participant.nom), age: String(participant.age), role };
    });
    const miseEau = normalized.filter((participant) => participant.role === "mise_eau").length;
    const observateurs = normalized.length - miseEau;
    if (miseEau > 6 || observateurs > 2) return NextResponse.json({ error: "Capacité Baleines dépassée." }, { status: 400 });
    const prices = normalized.map((participant) => getBaleinesParticipantPrice(participant));
    const total = prices.reduce((sum, price) => sum + price.amount, 0);
    if (!Number.isSafeInteger(total) || total <= 0) return NextResponse.json({ error: "Montant Baleines invalide." }, { status: 400 });
    const salon = prices.some((price) => price.pricingType === PUBLIC_PRICING_TYPE_SALON);
    const date = text(body.date_sortie), depart = text(body.depart);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || (depart !== "07:00" && depart !== "13:15")) return NextResponse.json({ error: "Date ou départ invalide." }, { status: 400 });
    const insertion = await adminClient().from("reservations_baleines").insert({
      date_sortie: date, depart, responsable_prenom: text(body.responsable_prenom), responsable_nom: text(body.responsable_nom),
      responsable_email: text(body.responsable_email), responsable_telephone: text(body.responsable_telephone),
      participants: normalized, nombre_mise_eau: miseEau, nombre_observateurs: observateurs,
      montant_total: total, devise: "XPF", statut_paiement: "pending", paye: false,
      source_paiement: salon ? "payzen_baleines_salon_tourisme_public" : "payzen_baleines",
    }).select("id,montant_total,source_paiement").single();
    if (insertion.error || !insertion.data) return NextResponse.json({ error: "Impossible d’enregistrer la réservation Baleines." }, { status: 500 });
    return NextResponse.json({ ...insertion.data, paymentToken: createPaymentIntentToken({ reservationId: String(insertion.data.id), reservationTable: "reservations_baleines", amount: Number(insertion.data.montant_total) }) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Réservation Baleines invalide." }, { status: 400 });
  }
}
