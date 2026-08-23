import { SALON_PRICING } from "./salon-pricing";

export const SALON_BALEINES_CATEGORIES = [
  "mise_eau",
  "observateur",
  "enfant_moins_12",
  "enfant_moins_5",
] as const;
export type SalonBaleinesCategory = (typeof SALON_BALEINES_CATEGORIES)[number];
export type SalonBaleinesComposition = Record<SalonBaleinesCategory, number>;

export const SALON_BALEINES_VALID_UNTIL = "2026-11-20";
export function getSalonBaleinesValidityLabel() {
  return SALON_PRICING.baleines.validiteOffres;
}

export const SALON_BALEINES_OFFERS = {
  mise_eau: { ...SALON_PRICING.baleines.miseEau, label: "Mise à l'eau" },
  observateur: { ...SALON_PRICING.baleines.observateur, label: "Observateur" },
  enfant_moins_12: {
    ...SALON_PRICING.baleines.enfantMoinsDouze,
    label: "Enfant -12 ans",
  },
  enfant_moins_5: {
    ...SALON_PRICING.baleines.enfantMoinsCinq,
    label: "Enfant -5 ans",
  },
} as const;

export function emptySalonBaleinesComposition(): SalonBaleinesComposition {
  return { mise_eau: 0, observateur: 0, enfant_moins_12: 0, enfant_moins_5: 0 };
}

export function parseSalonBaleinesComposition(
  value: unknown,
): SalonBaleinesComposition | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const composition = emptySalonBaleinesComposition();
  for (const category of SALON_BALEINES_CATEGORIES) {
    const count = Number(record[category] ?? 0);
    if (!Number.isInteger(count) || count < 0 || count > 8) return null;
    composition[category] = count;
  }
  return composition;
}

export function getSalonBaleinesCounts(composition: SalonBaleinesComposition) {
  return {
    miseEau: composition.mise_eau,
    observateurs:
      composition.observateur +
      composition.enfant_moins_12 +
      composition.enfant_moins_5,
    participants: Object.values(composition).reduce(
      (sum, count) => sum + count,
      0,
    ),
  };
}

export function calculateSalonBaleinesSale(
  kind: "individual" | "five_plus_one",
  compositionInput?: unknown,
) {
  if (kind === "five_plus_one") {
    const composition = {
      ...emptySalonBaleinesComposition(),
      mise_eau: SALON_PRICING.baleines.groupe.placesTotales,
    };
    return {
      kind,
      offerCode: SALON_PRICING.baleines.groupe.offerCode,
      label: "Offre Salon 5+1 — 6 mises à l'eau",
      composition,
      total: SALON_PRICING.baleines.groupe.total,
    };
  }
  const composition = parseSalonBaleinesComposition(compositionInput);
  if (!composition) return null;
  const counts = getSalonBaleinesCounts(composition);
  if (counts.participants < 1 || counts.miseEau > 6 || counts.observateurs > 2)
    return null;
  const total = SALON_BALEINES_CATEGORIES.reduce(
    (sum, category) =>
      sum + composition[category] * SALON_BALEINES_OFFERS[category].salon,
    0,
  );
  const label = SALON_BALEINES_CATEGORIES.filter(
    (category) => composition[category] > 0,
  )
    .map(
      (category) =>
        `${composition[category]} × ${SALON_BALEINES_OFFERS[category].label}`,
    )
    .join(" · ");
  return { kind, offerCode: "baleines_individuel", label, composition, total };
}
