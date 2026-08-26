import { POINTURES_PALMES, TAILLES_COMBI } from "@/app/baleines/lib/rules";
import { SALON_BALEINES_CATEGORIES, type SalonBaleinesCategory } from "@/lib/salonBaleines";

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
type Participant = Record<string, unknown>;

export function validateSalonBaleinesParticipants(
  value: unknown,
  composition: Record<SalonBaleinesCategory, number>,
) {
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
