import { datePermis, sansExamen } from "./permisPlanning";

export type PermisPlanning = { examen: string | null; date_cours: string | null; creneau: string | null };
export function parsePermisSlot(value: string | null | undefined) {
  const match = value?.trim().match(/^(\d{2})h(\d{2}) - (\d{2})h(\d{2})$/);
  if (!match) return null;
  const [, h1, m1, h2, m2] = match.map(Number);
  if (h1 > 23 || h2 > 23 || m1 > 59 || m2 > 59) return null;
  const start = h1 * 60 + m1, end = h2 * 60 + m2;
  return start < end ? { start, end } : null;
}
export function permisSlotsOverlap(a: string, b: string) {
  const left = parsePermisSlot(a), right = parsePermisSlot(b);
  if (!left || !right) throw new Error("Créneau non reconnu.");
  return left.start < right.end && right.start < left.end;
}
export function normalizePermisPlanning(value: PermisPlanning): PermisPlanning {
  const examen = sansExamen(value.examen) ? null : datePermis(value.examen);
  const date_cours = value.date_cours?.trim() ? datePermis(value.date_cours) : null;
  if ((!sansExamen(value.examen) && !examen) || (value.date_cours?.trim() && !date_cours)) throw new Error("Date non reconnue.");
  const creneau = value.creneau?.trim() || null;
  if (!!date_cours !== !!creneau || (creneau && !parsePermisSlot(creneau))) throw new Error("Cours et créneau incomplets.");
  return { examen, date_cours, creneau };
}
export function validatePermisPlanning(previous: PermisPlanning, patch: Partial<PermisPlanning>, today: string) {
  if (Object.keys(patch).some(key => !["examen", "date_cours", "creneau"].includes(key))) throw new Error("Champ interdit.");
  for (const value of Object.values(patch)) if (value !== null && typeof value !== "string") throw new Error("Valeur invalide.");
  const before = normalizePermisPlanning(previous);
  const after = normalizePermisPlanning({ ...previous, ...patch });
  if (after.examen && after.examen !== before.examen && after.examen < today) throw new Error("Examen passé.");
  if (after.date_cours && after.date_cours !== before.date_cours && after.date_cours < today) throw new Error("Cours passé.");
  if (after.examen && after.date_cours && after.date_cours >= after.examen) throw new Error("Le cours doit précéder l’examen.");
  if (after.date_cours && after.creneau && (after.date_cours !== before.date_cours || after.creneau !== before.creneau)) {
    const start = parsePermisSlot(after.creneau)!.start;
    if (new Date(after.date_cours + "T12:00:00Z").getUTCDay() === 3 && start < 780) throw new Error("Mercredi matin réservé aux examens.");
  }
  return { before, after, changed: JSON.stringify(before) !== JSON.stringify(after) };
}
