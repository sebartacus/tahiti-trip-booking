import { permisExamAvailable } from "@/lib/permisRepriseCalendar";
import { datePermis, sansExamen } from "@/lib/permisPlanning";
import { getTahitiToday } from "@/lib/tahiti-date";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getPermisPublicPrice } from "@/lib/public-pricing";
import { createPaymentIntentToken } from "@/lib/payment-intent";

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configuration Supabase Permis manquante.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (["pricing_amount", "pricing_type", "montant", "amount", "price"].some((key) => key in body)) {
      return NextResponse.json({ error: "Le prix est déterminé exclusivement par le serveur." }, { status: 400 });
    }
    const formule = body.formule;
    if (formule !== "Classique" && formule !== "Sérénité") return NextResponse.json({ error: "Formule invalide." }, { status: 400 });
    const nombreParticipants = Number(body.nombreParticipants);
    if (nombreParticipants !== 1 && nombreParticipants !== 2) return NextResponse.json({ error: "Nombre de participants invalide." }, { status: 400 });
    const prenom = text(body.prenom), nom = text(body.nom), telephone = text(body.telephone), email = text(body.email);
    if (!prenom || !nom || !telephone || !email) return NextResponse.json({ error: "Coordonnées incomplètes." }, { status: 400 });
    const examen=text(body.examen);
    if(!sansExamen(examen)&&!permisExamAvailable(examen,getTahitiToday()))return NextResponse.json({error:"Session d’examen indisponible ou délai de huit jours dépassé."},{status:400});
    const db=adminClient();
    if(!sansExamen(examen)){const blocked=await db.from("examens_bloques").select("id").eq("date_examen",datePermis(examen)).maybeSingle();if(blocked.error)throw blocked.error;if(blocked.data)return NextResponse.json({error:"Cette session d’examen est bloquée."},{status:409});}
    const pricing = getPermisPublicPrice(formule);
    const insertion = await db.from("reservations").insert({
      prenom, nom, prenom2: nombreParticipants === 2 ? text(body.prenom2) : null,
      nom2: nombreParticipants === 2 ? text(body.nom2) : null, telephone, email,
      formule, examen: text(body.examen), date_cours: text(body.date_cours) || null,
      type_cours: text(body.type_cours) || null, creneau: text(body.creneau) || null,
      paiement_effectue: false,
      pricing_type: pricing.salonActive ? "salon_tourisme" : "normal",
      pricing_amount: pricing.amount * nombreParticipants,
    }).select("id,pricing_amount,pricing_type").single();
    if (insertion.error || !insertion.data) return NextResponse.json({ error: "Impossible d’enregistrer la réservation." }, { status: 500 });
    return NextResponse.json({ ...insertion.data, paymentToken: createPaymentIntentToken({ reservationId: String(insertion.data.id), reservationTable: "reservations", amount: Number(insertion.data.pricing_amount) }) }, { status: 201 });
  } catch (error) {
    console.error("Création réservation Permis :", error);
    return NextResponse.json({ error: "Impossible d’enregistrer la réservation." }, { status: 500 });
  }
}
