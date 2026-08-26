import assert from "node:assert/strict";
import test from "node:test";
import { SALON_CHARTER_OFFER, SALON_CHARTER_VALID_UNTIL, validateSalonCharterPurchase } from "./salonCharter";
test("Tetiaroa Salon vaut 290 000 F CFP",()=>assert.equal(SALON_CHARTER_OFFER.price,290000));
test("validité Charter Salon",()=>assert.equal(SALON_CHARTER_VALID_UNTIL,"2027-01-31"));
test("participants 1 à 9",()=>{assert.ok("offer" in validateSalonCharterPurchase({offerCode:SALON_CHARTER_OFFER.code,participants:1,sleepingAccepted:false}));assert.match(validateSalonCharterPurchase({offerCode:SALON_CHARTER_OFFER.code,participants:10,sleepingAccepted:true}).error||"",/1 et 9/)});
test("couchage accepté à 9",()=>{assert.match(validateSalonCharterPurchase({offerCode:SALON_CHARTER_OFFER.code,participants:9,sleepingAccepted:false}).error||"",/couchage/);assert.ok("offer" in validateSalonCharterPurchase({offerCode:SALON_CHARTER_OFFER.code,participants:9,sleepingAccepted:true}))});
