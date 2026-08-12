import type { BoatActivity, BoatSlot, BoatStatus } from "./boat-calendar";

export const CHARTER_FORMULAS = [
  "tetiaroa_2j_1n",
  "tetiaroa_3j_2n",
  "moorea_matin",
  "moorea_journee",
  "sunset",
] as const;

export type CharterFormula = (typeof CHARTER_FORMULAS)[number];

export type CharterRequiredSlot = {
  date: string;
  slot: BoatSlot;
};

export type CharterCalendarSlot = CharterRequiredSlot & {
  status: BoatStatus;
  activity: BoatActivity | null;
  expires_at: string | null;
};

export type CharterAvailabilityConflict = {
  date: string;
  slot: BoatSlot;
  status: "hold" | "reserved" | "blocked";
  activity: BoatActivity | null;
};

const FORMULA_REQUIREMENTS: Record<
  CharterFormula,
  { days: number; slots: readonly BoatSlot[] }
> = {
  tetiaroa_2j_1n: { days: 2, slots: ["morning", "afternoon"] },
  tetiaroa_3j_2n: { days: 3, slots: ["morning", "afternoon"] },
  moorea_matin: { days: 1, slots: ["morning"] },
  moorea_journee: { days: 1, slots: ["morning", "afternoon"] },
  sunset: { days: 1, slots: ["afternoon"] },
};

export function isCharterFormula(value: unknown): value is CharterFormula {
  return (
    typeof value === "string" &&
    CHARTER_FORMULAS.includes(value as CharterFormula)
  );
}

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function addUtcDays(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function getCharterFormulaDuration(formula: CharterFormula) {
  return FORMULA_REQUIREMENTS[formula].days;
}

export function getCharterSlotRequirements(
  formula: CharterFormula,
  startDate: string
) {
  const requirement = FORMULA_REQUIREMENTS[formula];
  const requiredSlots: CharterRequiredSlot[] = [];

  for (let dayOffset = 0; dayOffset < requirement.days; dayOffset++) {
    const date = addUtcDays(startDate, dayOffset);

    for (const slot of requirement.slots) {
      requiredSlots.push({ date, slot });
    }
  }

  return {
    endDate: addUtcDays(startDate, requirement.days - 1),
    requiredSlots,
  };
}

export function getCharterAvailabilityConflicts(
  requiredSlots: CharterRequiredSlot[],
  calendarSlots: CharterCalendarSlot[],
  now: Date = new Date()
) {
  const requiredKeys = new Set(
    requiredSlots.map(({ date, slot }) => `${date}:${slot}`)
  );
  const nowTime = now.getTime();

  return calendarSlots.flatMap<CharterAvailabilityConflict>((calendarSlot) => {
    if (!requiredKeys.has(`${calendarSlot.date}:${calendarSlot.slot}`)) {
      return [];
    }

    const activeHold =
      calendarSlot.status === "hold" &&
      (!calendarSlot.expires_at ||
        new Date(calendarSlot.expires_at).getTime() > nowTime);
    const unavailable =
      calendarSlot.status === "reserved" ||
      calendarSlot.status === "blocked" ||
      activeHold;

    if (!unavailable || calendarSlot.status === "available") {
      return [];
    }

    return [
      {
        date: calendarSlot.date,
        slot: calendarSlot.slot,
        status: calendarSlot.status,
        activity: calendarSlot.activity,
      },
    ];
  });
}
