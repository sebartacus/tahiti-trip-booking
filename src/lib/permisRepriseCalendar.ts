import { datePermis } from "./permisPlanning";
import { parsePermisSlot } from "./permisScheduling";
import { permisHolidays, permisHolidayYearCovered } from "./permisHolidays";

const holidays = new Set(permisHolidays);
export function addPermisDays(iso: string, days: number) {
  const date = new Date(iso + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function permisExamOptions(today: string, requireVerifiedHolidays = false) {
  const dates: string[] = [];
  for (let offset = 1; offset <= 45 && dates.length < 4; offset++) {
    const day = addPermisDays(today, offset);
    if (new Date(day + "T12:00:00Z").getUTCDay() !== 3) continue;
    const exam = holidays.has(day) ? addPermisDays(day, 1) : day;
    if (requireVerifiedHolidays && !permisHolidayYearCovered(exam)) continue;
    if (today <= addPermisDays(exam, -8)) dates.push(exam);
  }
  return dates;
}
export function permisExamCalendarWarnings(today: string) {
  const years = new Set<string>();
  for (let offset = 1; offset <= 45; offset++) {
    const day = addPermisDays(today, offset);
    if (!permisHolidayYearCovered(day)) years.add(day.slice(0, 4));
  }
  return [...years].map(year => `Jours fériés ${year} à renseigner et vérifier : les sessions de cette année ne sont pas proposées.`);
}
export function permisAllowedSlots(day: string, typeCours?: string | null) {
  const individual = ["07h00 - 09h00","09h00 - 11h00","11h00 - 13h00","13h00 - 15h00","15h00 - 17h00"];
  const common = ["07h00 - 11h00","09h00 - 13h00","11h00 - 15h00","13h00 - 17h00"];
  const slots = typeCours === "commun" ? common : typeCours === "individuel" ? individual : [...individual, "13h00 - 17h00"];
  return slots.filter(slot => new Date(day + "T12:00:00Z").getUTCDay() !== 3 || parsePermisSlot(slot)!.start >= 780);
}
export function validPermisIso(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && datePermis(value) === value;
}
