import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getSalonAdminClient } from "@/lib/salonAdmin";
import {
  calculateSalonBaleinesSale,
  getSalonBaleinesCounts,
  SALON_BALEINES_VALID_UNTIL,
  type SalonBaleinesCategory,
} from "@/lib/salonBaleines";
import { isSalonPaymentMethod } from "@/lib/salonSales";
import {
  SAISON_DEBUT,
  SAISON_FIN,
  TAILLES_COMBI,
  POINTURES_PALMES,
} from "@/app/baleines/lib/rules";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEPARTS = new Set(["07:00", "13:15"]);
type Participant = {
  prenom?: unknown;
  nom?: unknown;
  age?: unknown;
  category?: unknown;
  materielPerso?: unknown;
  tailleCombinaison?: unknown;
  pointurePalmes?: unknown;
};
function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validateParticipants(
  value: unknown,
  expected: ReturnType<typeof calculateSalonBaleinesSale>,
) {
  if (!expected || !Array.isArray(value)) return null;
  const counts = {
    mise_eau: 0,
    observateur: 0,
    enfant_moins_12: 0,
    enfant_moins_5: 0,
  };
  const participants = (value as Participant[]).map((participant) => {
    const category = text(participant.category) as SalonBaleinesCategory;
    const prenom = text(participant.prenom);
    const nom = text(participant.nom);
    const age = Number(participant.age);
    if (
      !(category in counts) ||
      !prenom ||
      !nom ||
      !Number.isInteger(age) ||
      age < 0 ||
      age > 120
    )
      throw new Error("Informations participant incomplètes.");
    if (category === "mise_eau" && age < 12)
      throw new Error("Une mise à l'eau doit avoir au moins 12 ans.");
    if (category === "enfant_moins_12" && (age < 5 || age >= 12))
      throw new Error(
        "La catégorie enfant -12 ans exige un âge de 5 à 11 ans.",
      );
    if (category === "enfant_moins_5" && age >= 5)
      throw new Error(
        "La catégorie enfant -5 ans exige un âge inférieur à 5 ans.",
      );
    const materielPerso = participant.materielPerso === true;
    const tailleCombinaison = text(participant.tailleCombinaison);
    const pointurePalmes = text(participant.pointurePalmes);
    if (
      category === "mise_eau" &&
      !materielPerso &&
      (!TAILLES_COMBI.includes(tailleCombinaison) ||
        !POINTURES_PALMES.includes(pointurePalmes))
    )
      throw new Error(
        "Taille de combinaison et pointure requises pour chaque mise à l'eau.",
      );
    counts[category] += 1;
    return {
      prenom,
      nom,
      age: String(age),
      role: category === "mise_eau" ? "mise_eau" : "observateur",
      type: category,
      materielPerso,
      tailleCombinaison: category === "mise_eau" ? tailleCombinaison : "",
      pointurePalmes: category === "mise_eau" ? pointurePalmes : "",
    };
  });
  if (
    Object.entries(expected.composition).some(
      ([category, count]) =>
        counts[category as SalonBaleinesCategory] !== count,
    )
  )
    throw new Error(
      "La liste des participants ne correspond pas à la composition vendue.",
    );
  return participants;
}

export async function GET(request: Request) {
  if (!verifyAdminSession(request))
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  const date = new URL(request.url).searchParams.get("date") || "";
  if (date < SAISON_DEBUT || date > SAISON_FIN)
    return NextResponse.json(
      { error: "Date hors saison Baleines." },
      { status: 400 },
    );
  const supabase = getSalonAdminClient();
  const [reservations, slots] = await Promise.all([
    supabase
      .from("reservations_baleines")
      .select("depart,nombre_mise_eau,nombre_observateurs")
      .eq("date_sortie", date)
      .or("paye.eq.true,statut_paiement.in.(paid,paye)"),
    supabase
      .from("boat_calendar_slots")
      .select("slot,status,activity")
      .eq("date", date),
  ]);
  if (reservations.error || slots.error)
    return NextResponse.json(
      { error: "Disponibilités Baleines indisponibles." },
      { status: 500 },
    );
  const availability = {
    "07:00": { miseEau: 0, observateurs: 0, boatAvailable: true },
    "13:15": { miseEau: 0, observateurs: 0, boatAvailable: true },
  };
  for (const row of reservations.data || [])
    if (row.depart in availability) {
      const item = availability[row.depart as keyof typeof availability];
      item.miseEau += Number(row.nombre_mise_eau || 0);
      item.observateurs += Number(row.nombre_observateurs || 0);
    }
  for (const slot of slots.data || []) {
    const depart =
      slot.slot === "morning"
        ? "07:00"
        : slot.slot === "afternoon"
          ? "13:15"
          : null;
    if (depart && slot.status !== "available" && slot.activity !== "baleines")
      availability[depart].boatAvailable = false;
  }
  return NextResponse.json({
    availability,
    season: { start: SAISON_DEBUT, end: SAISON_FIN },
  });
}

export async function POST(request: Request) {
  if (!verifyAdminSession(request))
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const kind = body.kind === "five_plus_one" ? "five_plus_one" : "individual";
    const offer = calculateSalonBaleinesSale(kind, body.composition);
    if (!offer)
      return NextResponse.json(
        { error: "Composition Baleines invalide." },
        { status: 400 },
      );
    const firstName = text(body.firstName);
    const lastName = text(body.lastName);
    const phone = text(body.phone);
    const email = text(body.email).toLowerCase();
    if (!firstName || !lastName || !phone || (email && !EMAIL.test(email)))
      return NextResponse.json(
        { error: "Coordonnées client invalides." },
        { status: 400 },
      );
    if (!isSalonPaymentMethod(body.paymentMethod))
      return NextResponse.json(
        { error: "Moyen de paiement invalide." },
        { status: 400 },
      );
    const bookLater = body.bookLater === true;
    const date = bookLater ? "" : text(body.date);
    const depart = bookLater ? "" : text(body.depart);
    if (
      !bookLater &&
      (date < SAISON_DEBUT || date > SAISON_FIN || !DEPARTS.has(depart))
    )
      return NextResponse.json(
        { error: "Date ou départ Baleines invalide." },
        { status: 400 },
      );
    const participants = bookLater
      ? []
      : validateParticipants(body.participants, offer);
    const counts = getSalonBaleinesCounts(offer.composition);
    const snapshotLabel = bookLater
      ? `${offer.label} — à réserver`
      : `${offer.label} — ${date} · ${depart}`;
    const supabase = getSalonAdminClient();
    const creation = await supabase.rpc("create_salon_baleines_sale", {
      p_offer_code: offer.offerCode,
      p_label: snapshotLabel,
      p_composition: offer.composition,
      p_total: offer.total,
      p_valid_until: SALON_BALEINES_VALID_UNTIL,
      p_prenom: firstName,
      p_nom: lastName,
      p_telephone: phone,
      p_email: email,
      p_payment_method: body.paymentMethod,
      p_payment_reference: text(body.paymentReference),
      p_commentaire: text(body.comment),
      p_date_sortie: date || null,
      p_depart: depart || null,
      p_participants: participants,
    });
    if (creation.error) {
      const conflict = /capacite|indisponible/i.test(creation.error.message);
      return NextResponse.json(
        {
          error: conflict
            ? "Cette sortie n’a plus la capacité nécessaire."
            : "Impossible de créer la vente Baleines Salon.",
        },
        { status: conflict ? 409 : 500 },
      );
    }
    const result = Array.isArray(creation.data)
      ? creation.data[0]
      : creation.data;
    return NextResponse.json(
      {
        saleId: result.sale_id,
        reservationId: result.reservation_id,
        rightId: result.right_id,
        total: offer.total,
        label: snapshotLabel,
        counts,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de créer la vente Baleines Salon.",
      },
      { status: 400 },
    );
  }
}
