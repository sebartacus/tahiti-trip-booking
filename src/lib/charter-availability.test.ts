import {
  getCharterAvailabilityConflicts,
  getCharterSlotRequirements,
  type CharterCalendarSlot,
} from "./charter-availability";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const now = new Date("2026-08-11T12:00:00.000Z");

const twoDays = getCharterSlotRequirements("tetiaroa_2j_1n", "2026-08-15");
assert(twoDays.endDate === "2026-08-16", "La date de fin 2J/1N doit etre J2.");
assert(twoDays.requiredSlots.length === 4, "Tetiaroa 2J/1N doit demander quatre slots.");

const threeDays = getCharterSlotRequirements("tetiaroa_3j_2n", "2026-08-15");
assert(threeDays.endDate === "2026-08-17", "La date de fin 3J/2N doit etre J3.");
assert(threeDays.requiredSlots.length === 6, "Tetiaroa 3J/2N doit demander six slots.");

assert(
  getCharterSlotRequirements("moorea_matin", "2026-08-15").requiredSlots
    .map(({ slot: requiredSlot }) => requiredSlot).join(",") === "morning",
  "Moorea matin doit demander uniquement morning."
);
assert(
  getCharterSlotRequirements("moorea_journee", "2026-08-15").requiredSlots
    .map(({ slot: requiredSlot }) => requiredSlot).join(",") === "morning,afternoon",
  "Moorea journee doit demander morning et afternoon."
);
assert(
  getCharterSlotRequirements("sunset", "2026-08-15").requiredSlots
    .map(({ slot: requiredSlot }) => requiredSlot).join(",") === "afternoon",
  "Sunset doit demander uniquement afternoon."
);

function slot(
  date: string,
  boatSlot: "morning" | "afternoon",
  status: CharterCalendarSlot["status"],
  expiresAt: string | null = null
): CharterCalendarSlot {
  return {
    date,
    slot: boatSlot,
    status,
    activity: status === "blocked" || status === "available" ? null : "charter",
    expires_at: expiresAt,
  };
}

assert(
  getCharterAvailabilityConflicts(twoDays.requiredSlots, [], now).length === 0,
  "Une plage sans ligne calendrier doit etre disponible."
);

assert(
  getCharterAvailabilityConflicts(
    getCharterSlotRequirements("moorea_matin", "2026-08-15").requiredSlots,
    [slot("2026-08-15", "morning", "reserved")],
    now
  ).length === 1,
  "Un matin reserve doit etre indisponible."
);

assert(
  getCharterAvailabilityConflicts(
    getCharterSlotRequirements("sunset", "2026-08-15").requiredSlots,
    [slot("2026-08-15", "afternoon", "blocked")],
    now
  ).length === 1,
  "Un apres-midi bloque doit rendre le Sunset indisponible."
);

assert(
  getCharterAvailabilityConflicts(
    twoDays.requiredSlots,
    [slot("2026-08-16", "morning", "reserved")],
    now
  )[0]?.date === "2026-08-16",
  "Un conflit sur J2 doit rendre Tetiaroa 2J/1N indisponible."
);

assert(
  getCharterAvailabilityConflicts(
    threeDays.requiredSlots,
    [slot("2026-08-17", "afternoon", "reserved")],
    now
  )[0]?.date === "2026-08-17",
  "Un conflit sur J3 doit rendre Tetiaroa 3J/2N indisponible."
);

assert(
  getCharterAvailabilityConflicts(
    getCharterSlotRequirements("sunset", "2026-08-15").requiredSlots,
    [slot("2026-08-15", "afternoon", "hold", "2026-08-11T11:59:59.000Z")],
    now
  ).length === 0,
  "Un hold expire doit etre disponible."
);

assert(
  getCharterAvailabilityConflicts(
    getCharterSlotRequirements("sunset", "2026-08-15").requiredSlots,
    [slot("2026-08-15", "afternoon", "hold", "2026-08-11T12:30:00.000Z")],
    now
  ).length === 1,
  "Un hold actif doit etre indisponible."
);
