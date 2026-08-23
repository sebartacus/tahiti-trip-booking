import { SALON_PRICING } from "./salon-pricing";
import { SALON_PAYMENT_METHODS, getSalonCarnetOffer, getSalonCarnetValidUntil, getSalonPermisOffer, getSalonPermisValidUntil, isSalonPaymentMethod } from "./salonSales";

function assert(condition: boolean, message: string) { if (!condition) throw new Error(message); }
const classique = getSalonPermisOffer("permis_classique");
const serenite = getSalonPermisOffer("permis_serenite");
assert(classique?.price === 20_900, "Classique doit valoir 20 900 F CFP.");
assert(serenite?.price === 28_900, "Sérénité doit valoir 28 900 F CFP.");
assert(classique?.price === SALON_PRICING.permis.classique.salon, "Le prix doit venir de SALON_PRICING.");
assert(getSalonPermisOffer("prix_navigateur_1_franc") === null, "Le navigateur ne peut pas imposer une offre ou un prix.");
assert(getSalonPermisValidUntil() === "2027-01-31", "La validité doit être le 31 janvier 2027.");
assert(SALON_PAYMENT_METHODS.length === 4 && SALON_PAYMENT_METHODS.every(isSalonPaymentMethod), "Les quatre paiements manuels doivent être acceptés.");
assert(!isSalonPaymentMethod("payzen"), "PayZen doit être absent de l’Admin Salon.");
const carnet5 = getSalonCarnetOffer("carnet_baleines_5");
const carnet10 = getSalonCarnetOffer("carnet_baleines_10");
assert(carnet5?.price === 55_000 && carnet5.credits === 5, "Le carnet 5 Salon est incorrect.");
assert(carnet10?.price === 100_000 && carnet10.credits === 10, "Le carnet 10 Salon est incorrect.");
assert(getSalonCarnetOffer("carnet_baleines_falsifie") === null, "Une offre falsifiée doit être refusée.");
assert(getSalonCarnetValidUntil() === "2027-11-20", "La validité des carnets Salon est incorrecte.");
