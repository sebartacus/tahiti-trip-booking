import type { CharterFormula } from "./charter-availability";

export type ManualCharterSunsetOptions = {
  sunset_drink: "white_wine" | "champagne_included" | null;
  champagne_supplement: boolean;
};

export function normalizeManualCharterSunsetOptions(
  formula: CharterFormula,
  sunsetDrink: unknown,
  champagneSupplement: unknown
): ManualCharterSunsetOptions {
  if (formula !== "sunset") {
    return { sunset_drink: null, champagne_supplement: false };
  }

  return {
    sunset_drink:
      sunsetDrink === "champagne_included"
        ? "champagne_included"
        : "white_wine",
    champagne_supplement: champagneSupplement === true,
  };
}
