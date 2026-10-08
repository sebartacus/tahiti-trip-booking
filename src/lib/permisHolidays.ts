// Existing Polynesian holiday data. Add a verified, complete list for each new year.
// An absent year means unknown coverage, never an empty holiday calendar.
export const permisHolidaysByYear: Readonly<Record<string, readonly string[]>> = {
  "2026": ["2026-01-01", "2026-03-05", "2026-04-03", "2026-04-06", "2026-05-01", "2026-05-08", "2026-05-14", "2026-05-25", "2026-06-29", "2026-07-14", "2026-08-15", "2026-11-01", "2026-11-11", "2026-12-25"],
};
export const permisHolidays = Object.values(permisHolidaysByYear).flat();
export function permisHolidayYearCovered(iso: string) {
  return Object.hasOwn(permisHolidaysByYear, iso.slice(0, 4));
}
