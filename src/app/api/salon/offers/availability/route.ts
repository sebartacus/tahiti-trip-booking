import { NextResponse } from "next/server";
import { getSalonAdminClient } from "@/lib/salonAdmin";
import { getCharterSlotRequirements, isValidIsoDate } from "@/lib/charter-availability";
import { getTahitiToday } from "@/lib/tahiti-date";
import { loadAuthorizedSalonOffer } from "@/lib/salonPublicOffers";
import { verifySalonPublicAccessToken } from "@/lib/salonPublicAccess";

function bearer(request: Request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

export async function GET(request: Request) {
  const payload = verifySalonPublicAccessToken(bearer(request));
  if (!payload) return NextResponse.json({ error: "Accès expiré. Retrouvez de nouveau votre offre." }, { status: 401 });
  const authorized = await loadAuthorizedSalonOffer(payload);
  if (!authorized) return NextResponse.json({ error: "Offre introuvable." }, { status: 404 });
  if (authorized.right.status !== "unused") return NextResponse.json({ error: "Cette offre a déjà été réservée.", offer: authorized.offer }, { status: 409 });
  const date = new URL(request.url).searchParams.get("date") || "";
  if (!isValidIsoDate(date) || date < getTahitiToday() || date > authorized.offer.validUntil) return NextResponse.json({ error: "Date hors validité." }, { status: 400 });
  const supabase = getSalonAdminClient();

  if (payload.activity === "baleines") {
    const [reservations, calendar] = await Promise.all([
      supabase.from("reservations_baleines").select("depart,nombre_mise_eau,nombre_observateurs").eq("date_sortie", date).or("paye.eq.true,statut_paiement.in.(paid,paye,deposit_paid)"),
      supabase.from("boat_calendar_slots").select("slot,status,activity").eq("date", date),
    ]);
    if (reservations.error || calendar.error) return NextResponse.json({ error: "Disponibilités indisponibles." }, { status: 500 });
    const availability = { "07:00": { miseEau: 0, observateurs: 0, boatAvailable: true }, "13:15": { miseEau: 0, observateurs: 0, boatAvailable: true } };
    for (const row of reservations.data || []) if (row.depart in availability) { const item=availability[row.depart as keyof typeof availability]; item.miseEau+=Number(row.nombre_mise_eau||0); item.observateurs+=Number(row.nombre_observateurs||0); }
    for (const row of calendar.data || []) { const depart=row.slot==="morning"?"07:00":row.slot==="afternoon"?"13:15":null; if(depart&&row.status!=="available"&&row.activity!=="baleines") availability[depart].boatAvailable=false; }
    return NextResponse.json({ availability });
  }

  if (payload.activity === "peche") {
    const [reservations, calendar] = await Promise.all([
      supabase.from("reservations_peche").select("slots,nombre_personnes").eq("date_sortie", date).not("statut_paiement", "in", "(cancelled,failed)"),
      supabase.from("boat_calendar_slots").select("slot,status,activity").eq("date", date),
    ]);
    if (reservations.error || calendar.error) return NextResponse.json({ error: "Disponibilités indisponibles." }, { status: 500 });
    const availability={morning:{used:0,boatAvailable:true},afternoon:{used:0,boatAvailable:true}};
    for(const row of reservations.data||[])for(const slot of row.slots||[])if(slot in availability)availability[slot as keyof typeof availability].used+=Number(row.nombre_personnes||0);
    for(const row of calendar.data||[])if(row.slot in availability&&row.status!=="available"&&row.activity!=="peche")availability[row.slot as keyof typeof availability].boatAvailable=false;
    return NextResponse.json({ availability });
  }

  const { requiredSlots, endDate } = getCharterSlotRequirements("tetiaroa_2j_1n", date);
  if (endDate > authorized.offer.validUntil) return NextResponse.json({ error: "Le séjour dépasse la date de validité." }, { status: 400 });
  const calendar = await supabase.from("boat_calendar_slots").select("date,slot,status,expires_at").in("date", [date,endDate]);
  if (calendar.error) return NextResponse.json({ error: "Disponibilités indisponibles." }, { status: 500 });
  const now=Date.now();
  const conflicts=(calendar.data||[]).filter(row=>requiredSlots.some(slot=>slot.date===row.date&&slot.slot===row.slot)&&row.status!=="available"&&!(row.status==="hold"&&row.expires_at&&new Date(row.expires_at).getTime()<=now));
  return NextResponse.json({ available: conflicts.length===0, endDate });
}
