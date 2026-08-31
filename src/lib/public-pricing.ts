import { SALON_PRICING } from "./salon-pricing";
import { isSalonActive } from "./salon-period";

export const PUBLIC_PRICING_TYPE_NORMAL = "normal";
export const PUBLIC_PRICING_TYPE_SALON = "salon_tourisme_public";

export function getPermisPublicPrice(formula: "Classique" | "Sérénité", now = new Date()) {
  const offer = formula === "Sérénité" ? SALON_PRICING.permis.serenite : SALON_PRICING.permis.classique;
  const salonActive = isSalonActive(now);
  return { amount: salonActive ? offer.salon : offer.normal, normalAmount: offer.normal, pricingType: salonActive ? PUBLIC_PRICING_TYPE_SALON : PUBLIC_PRICING_TYPE_NORMAL, salonActive, label: formula };
}

export function getPechePublicPrice(formula: "morning" | "afternoon" | "full_day", now = new Date()) {
  const fullDay = formula === "full_day";
  const offer = fullDay ? SALON_PRICING.peche.privatisation.journee : SALON_PRICING.peche.privatisation.demiJournee;
  const salonActive = isSalonActive(now);
  return { amount: salonActive ? offer.salon : offer.normal, normalAmount: offer.normal, pricingType: salonActive ? PUBLIC_PRICING_TYPE_SALON : PUBLIC_PRICING_TYPE_NORMAL, salonActive, label: fullDay ? "Journée complète" : "Demi-journée" };
}

export type BaleinesPublicParticipant = { age: string | number; role: "mise_eau" | "observateur" };

export function getBaleinesParticipantPrice(participant: BaleinesPublicParticipant, now = new Date()) {
  const age = Number(participant.age);
  const salonActive = isSalonActive(now);
  let amount: number;
  let normalAmount: number;
  if (age > 0 && age < 12) {
    normalAmount = SALON_PRICING.baleines.enfantMoinsDouze.normal;
    amount = normalAmount;
  } else if (participant.role === "mise_eau") {
    normalAmount = SALON_PRICING.baleines.miseEau.normal;
    amount = salonActive ? SALON_PRICING.baleines.miseEau.salon : normalAmount;
  } else {
    normalAmount = SALON_PRICING.baleines.observateur.normal;
    amount = salonActive ? SALON_PRICING.baleines.observateur.salon : normalAmount;
  }
  return { amount, normalAmount, pricingType: salonActive ? PUBLIC_PRICING_TYPE_SALON : PUBLIC_PRICING_TYPE_NORMAL, salonActive };
}

export function getCharterPublicPrice(formula: string, normalAmount: number, now = new Date()) {
  const salonActive = isSalonActive(now) && formula === "tetiaroa_2j_1n";
  return { amount: salonActive ? SALON_PRICING.charter.tetiaroaDeuxJours.salon : normalAmount, normalAmount, pricingType: salonActive ? PUBLIC_PRICING_TYPE_SALON : PUBLIC_PRICING_TYPE_NORMAL, salonActive, label: formula };
}
