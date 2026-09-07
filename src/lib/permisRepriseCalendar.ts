import { datePermis } from "./permisPlanning";
import { parsePermisSlot } from "./permisScheduling";

// Same holiday list as the legacy/public screens; later-year holidays need maintenance.
const holidays = new Set(["2026-01-01","2026-03-05","2026-04-03","2026-04-06","2026-05-01","2026-05-08","2026-05-14","2026-05-25","2026-06-29","2026-07-14","2026-08-15","2026-11-01","2026-11-11","2026-12-25"]);
export function addPermisDays(iso: string, days: number) {
  const date = new Date(iso + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function permisExamOptions(today: string) {
  const dates: string[] = [];
  for (let offset = 1; offset <= 45 && dates.length < 4; offset++) {
    const day = addPermisDays(today, offset);
    if (new Date(day + "T12:00:00Z").getUTCDay() !== 3) continue;
    const exam = holidays.has(day) ? addPermisDays(day, 1) : day;
    if (today <= addPermisDays(exam, -8)) dates.push(exam);
  }
  return dates;
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
