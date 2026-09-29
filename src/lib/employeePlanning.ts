import { datePermis } from "./permisPlanning";

export const EMPLOYEE_ACTIVITIES = ["permis", "baleines", "peche", "peche-nuit", "charter"] as const;
export type EmployeeActivity = typeof EMPLOYEE_ACTIVITIES[number];
export type OperationalRow = Record<string, string | number | null>;
export const ACTIVITY_LABELS: Record<EmployeeActivity, string> = {
  permis: "Permis", baleines: "Baleines", peche: "Pêche", "peche-nuit": "Pêche nuit", charter: "Charter",
};
export const FORMULA_LABELS: Record<string, string> = {
  morning: "Matin · 07h15 – 12h00", afternoon: "Après-midi · 13h15 – 17h45", full_day: "Journée · 07h15 – 15h45",
  tetiaroa_2j_1n: "Tetiaroa · 2 jours / 1 nuit", tetiaroa_3j_2n: "Tetiaroa · 3 jours / 2 nuits",
  moorea_matin: "Moorea · 7h – 13h", moorea_journee: "Moorea · Journée", sunset: "Sunset privatif",
};
export type PlanningEvent = {
  isExam?: boolean;
  activity: EmployeeActivity; start: string; end: string; time: string; title: string;
  names: string[]; phone: string; people: number | null; exam: string | null; detail: string;
};
function text(row: OperationalRow, key: string) { return typeof row[key] === "string" ? row[key] as string : ""; }
function count(row: OperationalRow, key: string) { return typeof row[key] === "number" ? row[key] as number : null; }
export function planningEvent(activity: EmployeeActivity, row: OperationalRow): PlanningEvent | null {
  const start = datePermis(text(row, activity === "permis" ? "date_cours" : activity === "charter" ? "date_debut" : "date_sortie"));
  if (!start) return null;
  const names = activity === "permis"
    ? [[text(row, "prenom"), text(row, "nom")], [text(row, "prenom2"), text(row, "nom2")]].map(parts => parts.filter(Boolean).join(" ")).filter(Boolean)
    : [[text(row, "responsable_prenom"), text(row, "responsable_nom")].filter(Boolean).join(" ")].filter(Boolean);
  const formula = text(row, "formule");
  const swimmers = count(row, "nombre_mise_eau"), observers = count(row, "nombre_observateurs");
  return {
    activity, start, end: activity === "charter" ? datePermis(text(row, "date_fin")) || start : start,
    time: activity === "permis" || activity === "peche-nuit" ? text(row, "creneau") : activity === "baleines" ? text(row, "depart") : "",
    title: activity === "permis" ? "Cours pratique · Permis côtier" : FORMULA_LABELS[formula] || ACTIVITY_LABELS[activity],
    names, phone: text(row, activity === "permis" ? "telephone" : activity === "charter" ? "responsable_tel" : "responsable_telephone"),
    people: activity === "permis" ? (text(row, "prenom2").trim() || text(row, "nom2").trim() ? 2 : 1) :
      activity === "baleines" ? (swimmers === null && observers === null ? null : (swimmers || 0) + (observers || 0)) : count(row, "nombre_personnes"),
    exam: activity === "permis" ? datePermis(text(row, "examen")) : null,
    detail: activity === "peche-nuit" ? "Créneau bateau uniquement : horaire de sortie et détails participants à préciser." : activity === "baleines" ? `${swimmers ?? "?"} mises à l’eau · ${observers ?? "?"} observateurs` : "",
  };
}
export function planningEvents(activity: EmployeeActivity, row: OperationalRow): PlanningEvent[] {
  const course = planningEvent(activity, row);
  const events = course ? [course] : [];
  if (activity === "permis") {
    const exam = datePermis(text(row, "examen"));
    if (exam) {
      const event = planningEvent(activity, { ...row, date_cours: exam })!;
      events.push({ ...event, isExam: true, title: "EXAMEN PERMIS", time: "" });
    }
  }
  return events;
}
export function eventOnDay(event: PlanningEvent, day: string) { return event.start <= day && event.end >= day; }
export function monthBounds(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const first = datePermis(month + "-01");
  if (!first) return null;
  const [year, number] = month.split("-").map(Number);
  return { from: first, to: new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10) };
}
