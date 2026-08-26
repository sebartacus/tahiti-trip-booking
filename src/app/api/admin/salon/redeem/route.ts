import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getSalonAdminClient } from "@/lib/salonAdmin";
import { getCharterSlotRequirements, isValidIsoDate } from "@/lib/charter-availability";
import { POINTURES_PALMES, TAILLES_COMBI } from "@/app/baleines/lib/rules";
import { SALON_BALEINES_CATEGORIES, type SalonBaleinesCategory } from "@/lib/salonBaleines";

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
type Participant = Record<string, unknown>;

function validateBaleinesParticipants(value: unknown, composition: Record<SalonBaleinesCategory, number>) {
  if (!Array.isArray(value)) throw new Error("Participants Baleines requis.");
  const counts = Object.fromEntries(SALON_BALEINES_CATEGORIES.map((category) => [category, 0])) as Record<SalonBaleinesCategory, number>;
  const participants = (value as Participant[]).map((participant) => {
    const category = text(participant.category) as SalonBaleinesCategory;
    const prenom = text(participant.prenom), nom = text(participant.nom), age = Number(participant.age);
    if (!SALON_BALEINES_CATEGORIES.includes(category) || !prenom || !nom || !Number.isInteger(age) || age < 0 || age > 120) throw new Error("Informations participant incomplètes.");
    if (category === "mise_eau" && age < 12) throw new Error("Une mise à l’eau doit avoir au moins 12 ans.");
    if (category === "enfant_moins_12" && (age < 5 || age >= 12)) throw new Error("La catégorie enfant 5–11 ans est invalide.");
    if (category === "enfant_moins_5" && age >= 5) throw new Error("La catégorie enfant -5 ans est invalide.");
    const materielPerso = participant.materielPerso === true;
    const tailleCombinaison = text(participant.tailleCombinaison), pointurePalmes = text(participant.pointurePalmes);
    if (category === "mise_eau" && !materielPerso && (!TAILLES_COMBI.includes(tailleCombinaison) || !POINTURES_PALMES.includes(pointurePalmes))) throw new Error("Combinaison et palmes requises pour chaque mise à l’eau.");
    counts[category] += 1;
    return { prenom, nom, age: String(age), role: category === "mise_eau" ? "mise_eau" : "observateur", type: category, materielPerso, tailleCombinaison: category === "mise_eau" ? tailleCombinaison : "", pointurePalmes: category === "mise_eau" ? pointurePalmes : "" };
  });
  if (SALON_BALEINES_CATEGORIES.some((category) => counts[category] !== Number(composition[category] || 0))) throw new Error("La composition vendue doit être conservée exactement.");
  return participants;
}

export async function POST(request: Request) {
  if (!verifyAdminSession(request)) return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const activity = text(body.activity), rightId = text(body.rightId), date = text(body.date), slot = text(body.slot);
    if (!rightId || !isValidIsoDate(date)) return NextResponse.json({ error: "Droit ou date invalide." }, { status: 400 });
    const supabase = getSalonAdminClient();
    let rpc;
    if (activity === "baleines") {
      const right = await supabase.from("salon_baleines_rights").select("composition,status,valid_until").eq("id", rightId).single();
      if (right.error || !right.data || right.data.status !== "unused") return NextResponse.json({ error: "Droit Baleines indisponible." }, { status: 409 });
      const participants = validateBaleinesParticipants(body.participants, right.data.composition as Record<SalonBaleinesCategory, number>);
      rpc = await supabase.rpc("redeem_salon_baleines_right", { p_right_id: rightId, p_date_sortie: date, p_depart: slot, p_participants: participants });
    } else if (activity === "peche") {
      rpc = await supabase.rpc("redeem_salon_peche_right", { p_right_id: rightId, p_date_sortie: date, p_depart: slot });
    } else if (activity === "charter") {
      const requiredSlots = getCharterSlotRequirements("tetiaroa_2j_1n", date).requiredSlots;
      rpc = await supabase.rpc("redeem_salon_charter_right", { p_right_id: rightId, p_date_debut: date, p_requested_slots: requiredSlots });
    } else return NextResponse.json({ error: "Activité non planifiable." }, { status: 400 });
    if (rpc.error) {
      const conflict = /indisponible|conflit|capacit|utilis|validit/i.test(rpc.error.message);
      return NextResponse.json({ error: rpc.error.message }, { status: conflict ? 409 : 400 });
    }
    return NextResponse.json({ reservationId: rpc.data, date, slot: activity === "charter" ? null : slot }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Planification impossible." }, { status: 400 });
  }
}
