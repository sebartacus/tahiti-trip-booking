import { getPermisPricing } from "./permisPricing";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const normalPricing = getPermisPricing({
  promotionReservationsSold: 20,
  now: new Date("2026-08-01T12:00:00-10:00"),
});
assert(normalPricing.pricingType === "normal", "Le tarif normal doit revenir après 20 promotions.");
assert(normalPricing.prices.Classique === 25000, "Le tarif normal Classique doit être 25 000 XPF.");
assert(normalPricing.prices.Sérénité === 33000, "Le tarif normal Sérénité doit être 33 000 XPF.");
assert(!normalPricing.requiresExam, "Le tarif normal ne doit pas rendre l'examen obligatoire.");

const promotionPricing = getPermisPricing({
  promotionReservationsSold: 12,
  now: new Date("2026-08-01T12:00:00-10:00"),
});
assert(promotionPricing.pricingType === "promo_internet", "La promotion Internet doit être active avant 20 ventes.");
assert(promotionPricing.prices.Classique === 19000, "Le tarif promotion Classique doit être 19 000 XPF.");
assert(promotionPricing.prices.Sérénité === 27000, "Le tarif promotion Sérénité doit être 27 000 XPF.");
assert(promotionPricing.promotionsRemaining === 8, "Le nombre de promotions restantes doit être exact.");
assert(promotionPricing.requiresExam, "La promotion doit rendre l'examen obligatoire.");

const salonPricing = getPermisPricing({
  promotionReservationsSold: 3,
  now: new Date("2026-09-05T12:00:00-10:00"),
});
assert(salonPricing.pricingType === "salon_tourisme", "Le salon doit remplacer les autres tarifs.");
assert(salonPricing.prices.Classique === 21000, "Le tarif salon Classique doit être 21 000 XPF.");
assert(salonPricing.prices.Sérénité === 29000, "Le tarif salon Sérénité doit être 29 000 XPF.");
assert(!salonPricing.isPromotionActive, "La promotion Internet ne doit pas être active pendant le salon.");
