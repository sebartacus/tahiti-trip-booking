import assert from "node:assert/strict";
import test from "node:test";
import { getSalonPecheOffer, SALON_PECHE_VALID_UNTIL, validateSalonPechePurchase } from "./salonPeche";

const expected = { peche_privatisation_demi_journee: 79000, peche_privatisation_journee: 110000, peche_place_demi_journee: 33000, peche_place_journee: 40000, peche_2_plus_1_demi_journee: 66000, peche_2_plus_1_journee: 80000 };
for (const [code, price] of Object.entries(expected)) test(`${code} = ${price}`, () => assert.equal(getSalonPecheOffer(code)?.price, price));
test("validité Salon Pêche", () => assert.equal(SALON_PECHE_VALID_UNTIL, "2027-01-31"));
test("une place sans date est refusée", () => assert.match(validateSalonPechePurchase({ offerCode: "peche_place_demi_journee", bookLater: true, people: 1 }).error || "", /obligatoire/));
test("privatisation et 2+1 sans date sont autorisés", () => { assert.ok("offer" in validateSalonPechePurchase({ offerCode: "peche_privatisation_demi_journee", bookLater: true, people: 4 })); assert.ok("offer" in validateSalonPechePurchase({ offerCode: "peche_2_plus_1_journee", bookLater: true, people: 3 })); });
test("2+1 exige trois personnes", () => assert.match(validateSalonPechePurchase({ offerCode: "peche_2_plus_1_journee", bookLater: false, people: 2, departure: "morning" }).error || "", /exactement 3/));
test("privatisation accepte jusqu’à quatre personnes", () => { assert.ok("offer" in validateSalonPechePurchase({ offerCode: "peche_privatisation_journee", bookLater: false, people: 1, departure: "morning" })); assert.match(validateSalonPechePurchase({ offerCode: "peche_privatisation_journee", bookLater: false, people: 5, departure: "morning" }).error || "", /1 à 4/); });
