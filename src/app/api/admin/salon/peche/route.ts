import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getSalonAdminClient } from "@/lib/salonAdmin";
import { isSalonPaymentMethod } from "@/lib/salonSales";
import { SALON_PECHE_VALID_UNTIL, validateSalonPechePurchase } from "@/lib/salonPeche";
import { getTahitiToday } from "@/lib/tahiti-date";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

export async function GET(request: Request) {
  if (!verifyAdminSession(request)) return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  const date = new URL(request.url).searchParams.get("date") || "";
  if (!ISO_DATE.test(date) || date < getTahitiToday() || date > SALON_PECHE_VALID_UNTIL) return NextResponse.json({ error: "Date Pêche invalide." }, { status: 400 });
  const supabase = getSalonAdminClient();
  const [reservations, calendar] = await Promise.all([
    supabase.from("reservations_peche").select("slots,nombre_personnes,origine").eq("date_sortie", date).not("statut_paiement", "in", "(cancelled,failed)"),
    supabase.from("boat_calendar_slots").select("slot,status,activity").eq("date", date),
  ]);
  if (reservations.error || calendar.error) return NextResponse.json({ error: "Disponibilités Pêche indisponibles." }, { status: 500 });
  const availability = { morning: { used: 0, boatAvailable: true }, afternoon: { used: 0, boatAvailable: true } };
  for (const reservation of reservations.data || []) for (const slot of reservation.slots || []) if (slot in availability) availability[slot as keyof typeof availability].used += Number(reservation.nombre_personnes || 0);
  for (const slot of calendar.data || []) if (slot.slot in availability && slot.status !== "available" && slot.activity !== "peche") availability[slot.slot as keyof typeof availability].boatAvailable = false;
  return NextResponse.json({ availability, validUntil: SALON_PECHE_VALID_UNTIL });
}

export async function POST(request: Request) {
  if (!verifyAdminSession(request)) return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    if (["unit_price", "total_price", "montant_total", "price", "total"].some((key) => key in body)) return NextResponse.json({ error: "Les montants sont déterminés exclusivement par le serveur." }, { status: 400 });
    const bookLater = body.bookLater === true;
    const validation = validateSalonPechePurchase({ offerCode: body.offerCode, bookLater, people: body.people, departure: body.departure });
    if ("error" in validation) return NextResponse.json({ error: validation.error }, { status: 400 });
    const firstName = text(body.firstName), lastName = text(body.lastName), phone = text(body.phone), email = text(body.email).toLowerCase();
    if (!firstName || !lastName || !phone || (email && !EMAIL.test(email))) return NextResponse.json({ error: "Coordonnées client invalides." }, { status: 400 });
    if (!isSalonPaymentMethod(body.paymentMethod)) return NextResponse.json({ error: "Moyen de paiement invalide." }, { status: 400 });
    const date = bookLater ? "" : text(body.date);
    if (!bookLater && (!ISO_DATE.test(date) || date < getTahitiToday() || date > SALON_PECHE_VALID_UNTIL)) return NextResponse.json({ error: "Date de sortie Pêche invalide." }, { status: 400 });
    const creation = await getSalonAdminClient().rpc("create_salon_peche_sale", {
      p_offer_code: validation.offer.code, p_prenom: firstName, p_nom: lastName, p_telephone: phone, p_email: email,
      p_price: validation.offer.price,
      p_payment_method: body.paymentMethod, p_payment_reference: text(body.paymentReference), p_commentaire: text(body.comment),
      p_nombre_personnes: Number(body.people),
      p_date_sortie: date || null, p_depart: bookLater ? null : text(body.departure),
    });
    if (creation.error) {
      const conflict = /indisponible|capacit|occupe/i.test(creation.error.message);
      return NextResponse.json({ error: conflict ? "Le créneau Pêche n’est plus disponible." : creation.error.message }, { status: conflict ? 409 : 400 });
    }
    const result = Array.isArray(creation.data) ? creation.data[0] : creation.data;
    return NextResponse.json({ saleId: result.sale_id, reservationId: result.reservation_id, rightId: result.right_id, label: validation.offer.label, total: validation.offer.price }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Création Pêche Salon impossible." }, { status: 400 });
  }
}
