export const DATE_EXPIRATION_CARNETS_BALEINES = "2026-11-20";
export const DATE_EXPIRATION_CARNETS_BALEINES_MANUEL = "2027-11-20";

export const MODES_PAIEMENT_CARNET_MANUEL = [
  { value: "especes", label: "Espèces" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement" },
  { value: "carte", label: "Carte bancaire" },
  { value: "autre", label: "Autre" },
] as const;

export type ModePaiementCarnetManuel =
  (typeof MODES_PAIEMENT_CARNET_MANUEL)[number]["value"];

export const OFFRES_CARNETS_BALEINES = [
  {
    credits: 5,
    nom: "Carnet 5 sorties",
    prix: 65_000,
    economie: 10_000,
    avantages: [
      "5 crédits",
      "1 crédit = 1 participant",
      "Valable pour une mise à l’eau, un observateur ou un enfant",
      "Utilisable pour une ou plusieurs personnes",
      "Valable jusqu’au 20 novembre 2026",
    ],
  },
  {
    credits: 10,
    nom: "Carnet 10 sorties",
    prix: 115_000,
    economie: 35_000,
    avantages: [
      "10 crédits",
      "1 crédit = 1 participant",
      "Valable pour une mise à l’eau, un observateur ou un enfant",
      "Utilisable pour une ou plusieurs personnes",
      "Valable jusqu’au 20 novembre 2026",
    ],
  },
] as const;

export type OffreCarnetBaleines = (typeof OFFRES_CARNETS_BALEINES)[number];
export type NombreCreditsCarnetBaleines = OffreCarnetBaleines["credits"];

export function getOffreCarnetBaleines(credits: number) {
  return OFFRES_CARNETS_BALEINES.find((offre) => offre.credits === credits);
}

export function getModePaiementCarnetLabel(value: string | null | undefined) {
  if (!value || value === "payzen") return "PayZen";

  return (
    MODES_PAIEMENT_CARNET_MANUEL.find((mode) => mode.value === value)?.label ||
    value
  );
}

export function calculerCreditsCarnet(participants: readonly unknown[]) {
  return participants.length;
}
