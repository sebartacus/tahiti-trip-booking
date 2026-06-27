export type Depart = "07:00" | "13:15";

export type TypeParticipant =
  | "mise_eau"
  | "observateur_adulte"
  | "observateur_enfant";

export interface Participant {
  id: string;

  prenom: string;
  nom: string;

  type: TypeParticipant;

  materielPerso: boolean;

  tailleCombinaison: string;
  pointurePalmes: string;

  ouvert: boolean;
}

export interface ResponsableReservation {
  prenom: string;
  nom: string;
  telephone: string;
  email: string;
}

export interface ReservationBaleines {
  id?: string;

  date: string;

  depart: Depart;

  responsable: ResponsableReservation;

  participants: Participant[];

  montant: number;

  paye: boolean;

  statutPaiement:
    | "pending"
    | "paid"
    | "cancelled";

  createdAt?: string;
}

export interface DisponibilitesDepart {

  depart: Depart;

  miseEauOccupees: number;

  observateursOccupes: number;

  miseEauRestantes: number;

  observateursRestants: number;

}

export const MAX_MISE_EAU = 6;

export const MAX_OBSERVATEURS = 2;

export const TARIF_MISE_EAU = 15000;

export const TARIF_OBSERVATEUR = 8500;

export const TARIF_OBSERVATEUR_ENFANT = 7000;

export const SAISON_DEBUT = "2026-07-20";

export const SAISON_FIN = "2026-11-20";

export const TAILLES_COMBINAISON = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
];

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