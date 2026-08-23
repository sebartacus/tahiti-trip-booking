import { calculateSalonTax, SALON_TVA_RATE } from "./salonTax";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

for (const expected of [
  { ttc: 55_000, ht: 52_381, tva: 2_619 },
  { ttc: 100_000, ht: 95_238, tva: 4_762 },
  { ttc: 20_900, ht: 19_905, tva: 995 },
  { ttc: 28_900, ht: 27_524, tva: 1_376 },
]) {
  const result = calculateSalonTax(expected.ttc);
  assert(result.ht === expected.ht, `HT incorrect pour ${expected.ttc}.`);
  assert(result.tva === expected.tva, `TVA incorrecte pour ${expected.ttc}.`);
  assert(result.ttc === expected.ttc, `TTC incorrect pour ${expected.ttc}.`);
  assert(
    result.ht + result.tva === result.ttc,
    `Somme HT + TVA incorrecte pour ${expected.ttc}.`,
  );
  assert(result.tauxTva === SALON_TVA_RATE, "Taux de TVA incorrect.");
}
