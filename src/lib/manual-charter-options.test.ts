// @ts-expect-error Node's type-stripping test runner requires the source extension.
import { normalizeManualCharterSunsetOptions } from "./manual-charter-options.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// Reproduction du bug : Sunset configure, puis passage vers Tetiaroa.
const afterSunsetToTetiaroa = normalizeManualCharterSunsetOptions(
  "tetiaroa_2j_1n",
  "champagne_included",
  true
);
assert(afterSunsetToTetiaroa.sunset_drink === null, "Tetiaroa ne doit envoyer aucune boisson Sunset.");
assert(afterSunsetToTetiaroa.champagne_supplement === false, "Tetiaroa ne doit envoyer aucun supplement Champagne.");

for (const formula of [
  "tetiaroa_2j_1n",
  "tetiaroa_3j_2n",
  "moorea_matin",
  "moorea_journee",
] as const) {
  const options = normalizeManualCharterSunsetOptions(formula, "white_wine", true);
  assert(options.sunset_drink === null, `${formula}: sunset_drink doit etre null.`);
  assert(options.champagne_supplement === false, `${formula}: champagne_supplement doit etre false.`);
}

const sunset = normalizeManualCharterSunsetOptions("sunset", "champagne_included", false);
assert(sunset.sunset_drink === "champagne_included", "Sunset doit conserver la boisson choisie.");
assert(sunset.champagne_supplement === false, "Sunset doit conserver le choix du supplement.");
