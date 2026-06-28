import type { Demandes, Participant, Role } from "./types";

export const SAISON_DEBUT = "2026-07-20";
export const SAISON_FIN = "2026-11-20";

export const MAX_MISE_EAU = 6;
export const MAX_OBSERVATEURS = 2;

export const TARIF_MISE_EAU = 15000;
export const TARIF_OBSERVATEUR = 8500;
export const TARIF_ENFANT_OBSERVATEUR = 7000;

export const TAILLES_COMBI = ["XS", "S", "M", "L", "XL", "XXL"];

export const POINTURES_PALMES = [
  "34",
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
  "49",
];

export function nouveauParticipant(role: Role = "mise_eau"): Participant {
  return {
    prenom: "",
    nom: "",
    age: "",
    role,
    materielPerso: false,
    tailleCombinaison: "",
    pointurePalmes: "",
  };
}

export function prixParticipant(participant: Participant) {
  const age = Number(participant.age);

  if (participant.role === "mise_eau") return TARIF_MISE_EAU;
  if (age > 0 && age < 12) return TARIF_ENFANT_OBSERVATEUR;

  return TARIF_OBSERVATEUR;
}

export function formatPrix(montant: number) {
  return `${montant.toLocaleString("fr-FR")} FCP`;
}

export function compterDemandes(participants: Participant[]): Demandes {
  return participants.reduce(
    (acc, participant) => {
      if (participant.role === "mise_eau") acc.miseEau += 1;
      if (participant.role === "observateur") acc.observateurs += 1;
      return acc;
    },
    { miseEau: 0, observateurs: 0 }
  );
}

export function afficherMateriel(participant: Participant) {
  return participant.role === "mise_eau" && participant.materielPerso === false;
}

export function nettoyerParticipant(participant: Participant): Participant {
  if (participant.role === "observateur" || participant.materielPerso) {
    return {
      ...participant,
      materielPerso:
        participant.role === "observateur" ? false : participant.materielPerso,
      tailleCombinaison: "",
      pointurePalmes: "",
    };
  }

  return participant;
}
