export const SALON_TIME_ZONE = "Pacific/Tahiti";

// Tahiti does not observe daylight saving time (UTC-10).
export const SALON_START = "2026-09-03T00:00:00-10:00";
export const SALON_END = "2026-09-06T18:00:00-10:00";

const SALON_START_MS = Date.parse(SALON_START);
const SALON_END_MS = Date.parse(SALON_END);

export function isSalonActive(now: Date = new Date()) {
  const instant = now.getTime();
  return instant >= SALON_START_MS && instant < SALON_END_MS;
}
