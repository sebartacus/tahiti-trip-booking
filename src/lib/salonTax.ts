export const SALON_TVA_RATE = 0.05;

export function calculateSalonTax(ttc: number) {
  if (!Number.isFinite(ttc) || ttc < 0) {
    throw new Error("Le montant TTC doit être un nombre positif ou nul.");
  }

  const roundedTtc = Math.round(ttc);
  const ht = Math.round(roundedTtc / (1 + SALON_TVA_RATE));

  return {
    ht,
    tva: roundedTtc - ht,
    ttc: roundedTtc,
    tauxTva: SALON_TVA_RATE,
  };
}
