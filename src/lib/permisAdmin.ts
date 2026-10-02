// Admin-only tariff selection: deliberately independent of public Salon dates.
export type PermisAdminTariff = "normal" | "salon_tourisme";
const PRICES = {
  normal: { Classique: 25000, Sérénité: 33000 },
  salon_tourisme: { Classique: 20900, Sérénité: 28900 },
} as const;

export function getPermisAdminPrice(formula: unknown, tariff: unknown) {
  if ((formula !== "Classique" && formula !== "Sérénité") ||
      (tariff !== "normal" && tariff !== "salon_tourisme")) return null;
  return { pricing_type: tariff, pricing_amount: PRICES[tariff][formula] };
}

export type ManualPermisPaymentState = {
  origine_reservation?: string | null;
  mode_paiement?: string | null;
  pricing_type?: string | null;
  paiement_effectue?: boolean | null;
  archived?: boolean | null;
  prenom2?: string | null;
  nom2?: string | null;
};
export function isManualPayzenPermis(row: ManualPermisPaymentState) {
  return row.origine_reservation === "salon_admin" && row.mode_paiement === "payzen" &&
    (row.pricing_type === "normal" || row.pricing_type === "salon_tourisme") &&
    !row.prenom2?.trim() && !row.nom2?.trim();
}
export function canMarkPermisPaid(row: ManualPermisPaymentState) {
  return isManualPayzenPermis(row) && row.paiement_effectue === false && !row.archived;
}
