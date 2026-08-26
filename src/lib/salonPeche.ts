import { SALON_PRICING } from "./salon-pricing";

export const SALON_PECHE_VALID_UNTIL = "2027-01-31";
export type SalonPecheFormula = "half_day" | "full_day";
export type SalonPecheOfferKind = "privatisation" | "place" | "two_plus_one";

export const SALON_PECHE_OFFERS = [
  { code: SALON_PRICING.peche.privatisation.demiJournee.offerCode, kind: "privatisation", formula: "half_day", label: "Privatisation du bateau — demi-journée", price: SALON_PRICING.peche.privatisation.demiJournee.salon, people: 4, bookLater: true },
  { code: SALON_PRICING.peche.privatisation.journee.offerCode, kind: "privatisation", formula: "full_day", label: "Privatisation du bateau — journée", price: SALON_PRICING.peche.privatisation.journee.salon, people: 4, bookLater: true },
  { code: "peche_place_demi_journee", kind: "place", formula: "half_day", label: "Une place Pêche — demi-journée", price: SALON_PRICING.peche.place.demiJournee, people: 1, bookLater: false },
  { code: "peche_place_journee", kind: "place", formula: "full_day", label: "Une place Pêche — journée", price: SALON_PRICING.peche.place.journee, people: 1, bookLater: false },
  { code: "peche_2_plus_1_demi_journee", kind: "two_plus_one", formula: "half_day", label: "Offre Pêche 2+1 — demi-journée — 3 personnes", price: SALON_PRICING.peche.offreTrois.demiJournee, people: 3, bookLater: true },
  { code: "peche_2_plus_1_journee", kind: "two_plus_one", formula: "full_day", label: "Offre Pêche 2+1 — journée — 3 personnes", price: SALON_PRICING.peche.offreTrois.journee, people: 3, bookLater: true },
] as const;

export function getSalonPecheOffer(code: unknown) {
  return SALON_PECHE_OFFERS.find((offer) => offer.code === code) || null;
}

export function getSalonPecheSlots(formula: SalonPecheFormula, departure: unknown) {
  if (formula === "full_day") return departure === "morning" ? ["morning", "afternoon"] as const : null;
  return departure === "morning" || departure === "afternoon" ? [departure] as const : null;
}

export function validateSalonPechePurchase(input: { offerCode: unknown; bookLater: boolean; people: unknown; departure?: unknown }) {
  const offer = getSalonPecheOffer(input.offerCode);
  if (!offer) return { error: "Offre Pêche Salon invalide." } as const;
  if (input.bookLater && !offer.bookLater) return { error: "La date de sortie est obligatoire pour une place individuelle." } as const;
  const people = Number(input.people);
  if (offer.kind === "privatisation" ? !Number.isInteger(people) || people < 1 || people > 4 : people !== offer.people) return { error: offer.kind === "privatisation" ? "Une privatisation accepte de 1 à 4 participants." : `Cette offre exige exactement ${offer.people} participant${offer.people > 1 ? "s" : ""}.` } as const;
  const slots = input.bookLater ? [] : getSalonPecheSlots(offer.formula, input.departure);
  if (!input.bookLater && !slots) return { error: "Départ Pêche invalide." } as const;
  return { offer, slots } as const;
}
