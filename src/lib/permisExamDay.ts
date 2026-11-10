import { datePermis } from "./permisPlanning";
import { permisHolidays, permisHolidayYearCovered } from "./permisHolidays";

const holidays = new Set(permisHolidays);
export function addPermisDays(iso: string, days: number) {
  const date = new Date(iso + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function permisExamClosed(iso: string) { return iso >= "2026-12-23" && iso <= "2027-01-12"; }

// Session dates do not depend on registration deadlines or the candidate's exam.
// Recorded sessions also cover exceptional dates outside the regular calendar.
export function permisIsExamDay(value: string, recordedSessions: readonly string[] = [], requireVerifiedHolidays = true) {
  const iso = datePermis(value);
  if (!iso) return false;
  if (recordedSessions.some(day => datePermis(day) === iso)) return true;
  if (permisExamClosed(iso) || (requireVerifiedHolidays && !permisHolidayYearCovered(iso))) return false;
  const weekday = new Date(iso + "T12:00:00Z").getUTCDay();
  return weekday === 3 && !holidays.has(iso) || weekday === 4 && holidays.has(addPermisDays(iso, -1));
}
