import { SALON_PRICING } from "./salon-pricing";

export const SALON_PAYMENT_METHODS = ["tpe", "especes", "cheque", "virement"] as const;
export type SalonPaymentMethod = (typeof SALON_PAYMENT_METHODS)[number];
export type SalonPermisOfferCode =
  | typeof SALON_PRICING.permis.classique.offerCode
  | typeof SALON_PRICING.permis.serenite.offerCode;

export const SALON_PAYMENT_LABELS: Record<SalonPaymentMethod, string> = {
  tpe: "Carte bancaire / TPE",
  especes: "Espèces",
  cheque: "Chèque",
  virement: "Virement",
};

export function getSalonPermisOffer(code: unknown) {
  const offers = [
    { code: SALON_PRICING.permis.classique.offerCode, formula: "Classique", label: "Permis côtier – Classique", price: SALON_PRICING.permis.classique.salon },
    { code: SALON_PRICING.permis.serenite.offerCode, formula: "Sérénité", label: "Permis côtier – Sérénité", price: SALON_PRICING.permis.serenite.salon },
  ] as const;
  return offers.find((offer) => offer.code === code) || null;
}

export function isSalonPaymentMethod(value: unknown): value is SalonPaymentMethod {
  return typeof value === "string" && SALON_PAYMENT_METHODS.includes(value as SalonPaymentMethod);
}

export function getSalonPermisValidUntil() {
  return "2027-01-31";
}

export function getSalonPermisValidityLabel() {
  return SALON_PRICING.permis.validite;
}
