import {
  calculateSalonBaleinesSale,
  getSalonBaleinesCounts,
  getSalonBaleinesValidityLabel,
  SALON_BALEINES_VALID_UNTIL,
} from "./salonBaleines";
import { SALON_PRICING } from "./salon-pricing";

function assert(value: boolean, message: string) {
  if (!value) throw new Error(message);
}
for (const [category, price] of [
  ["mise_eau", 12_500],
  ["observateur", 8_500],
  ["enfant_moins_12", 7_000],
  ["enfant_moins_5", 0],
] as const) {
  const result = calculateSalonBaleinesSale("individual", { [category]: 1 });
  assert(result?.total === price, `Tarif ${category} incorrect.`);
}
const mixed = calculateSalonBaleinesSale("individual", {
  mise_eau: 2,
  observateur: 1,
  enfant_moins_12: 1,
});
assert(mixed?.total === 40_500, "Composition multi-catégories incorrecte.");
const group = calculateSalonBaleinesSale("five_plus_one");
assert(group?.total === 62_500, "Prix 5+1 incorrect.");
assert(
  group ? getSalonBaleinesCounts(group.composition).miseEau === 6 : false,
  "Le 5+1 doit représenter 6 mises à l'eau.",
);
assert(
  calculateSalonBaleinesSale("individual", { mise_eau: 7 }) === null,
  "Une 7e mise à l'eau doit être refusée.",
);
assert(
  SALON_BALEINES_VALID_UNTIL === "2026-11-20",
  "Validité ISO Baleines incorrecte.",
);
assert(
  getSalonBaleinesValidityLabel() === "20 novembre 2026",
  "Libellé de validité Baleines incorrect.",
);
assert(
  SALON_PRICING.baleines.validiteCarnets === "20 novembre 2027",
  "La validité des carnets ne doit pas changer.",
);
