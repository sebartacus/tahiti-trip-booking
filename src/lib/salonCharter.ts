import { SALON_PRICING } from "./salon-pricing";

export const SALON_CHARTER_OFFER_CODE = "charter_tetiaroa_2j_1n";
export const SALON_CHARTER_VALID_UNTIL = "2027-01-31";
export const SALON_CHARTER_OFFER = {
  code: SALON_CHARTER_OFFER_CODE,
  label: "Tetiaroa 2 jours / 1 nuit — catamaran privatisé",
  price: SALON_PRICING.charter.tetiaroaDeuxJours.salon,
  normalPrice: SALON_PRICING.charter.tetiaroaDeuxJours.normal,
  capacity: SALON_PRICING.charter.tetiaroaDeuxJours.capacite,
} as const;

export function validateSalonCharterPurchase(input: { offerCode: unknown; participants: unknown; sleepingAccepted: unknown }) {
  if (input.offerCode !== SALON_CHARTER_OFFER_CODE) return { error: "Offre Charter Salon invalide." } as const;
  const participants = Number(input.participants);
  if (!Number.isInteger(participants) || participants < 1 || participants > SALON_CHARTER_OFFER.capacity) return { error: "Le nombre de participants doit être compris entre 1 et 9." } as const;
  if (participants === 9 && input.sleepingAccepted !== true) return { error: "L’acceptation du couchage dans le carré est obligatoire à 9 personnes." } as const;
  return { offer: SALON_CHARTER_OFFER, participants } as const;
}
