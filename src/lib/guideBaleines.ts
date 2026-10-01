export type GuideParticipant = {
  prenom: string | null; nom: string | null;
  role: "mise_eau" | "observateur" | null;
  age: number | null; type: string | null;
  tailleCombinaison: string | null; pointurePalmes: string | null;
  materielPerso: boolean | null;
};
export type GuideReservation = {
  date_sortie: string | null; depart: string | null;
  nombre_mise_eau: number | null; nombre_observateurs: number | null;
  responsable_prenom: string | null; responsable_nom: string | null;
  responsable_telephone: string | null; participants: GuideParticipant[];
};
export type GuideDeparture = {
  date: string; depart: string; nageurs: number | null; observateurs: number | null;
  reservations: GuideReservation[];
};
export const MISSING = "Non renseigné";

export function guideMonthBounds(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [year, number] = month.split("-").map(Number);
  if (year < 1000 || year > 9998) return null;
  return { from: month + "-01", to: new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10) };
}
export function shiftGuideMonth(month: string, delta: number) {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + delta, 1)).toISOString().slice(0, 7);
}
export function guideDateLabel(day: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
    .format(new Date(day + "T12:00:00Z"));
}
export function guidePersonName(nom: string | null, prenom: string | null) {
  return [nom, prenom].filter(Boolean).join(" ") || MISSING;
}
export function guideEquipmentLabel(value: boolean | null) {
  return value === true ? "Oui" : value === false ? "Non" : MISSING;
}
export function guideAgeLabel(age: number | null) {
  if (age === null) return MISSING;
  const range = age < 5 ? "moins de 5 ans" : age < 12 ? "5–11 ans" : age < 18 ? "12–17 ans" : "adulte";
  return age + (age === 1 ? " an" : " ans") + " · " + range;
}
export function guidePhoneHref(phone: string | null) {
  if (!phone) return undefined;
  const digits = phone.replace(/[\s().-]/g, "");
  return /^\+?\d{4,15}$/.test(digits) ? "tel:" + digits : undefined;
}
export function guideParticipantType(type: string | null) {
  const labels: Record<string, string> = {
    mise_eau: "Nageur", observateur: "Observateur", observateur_adulte: "Observateur adulte",
    observateur_enfant: "Observateur enfant", enfant_moins_12: "Enfant de 5 à 11 ans",
    enfant_moins_5: "Enfant de moins de 5 ans",
  };
  return type ? labels[type] || MISSING : MISSING;
}
export function groupGuideDepartures(rows: GuideReservation[]): GuideDeparture[] {
  const groups = new Map<string, GuideDeparture>();
  for (const row of rows) {
    if (!row.date_sortie || !row.depart) continue;
    const key = row.date_sortie + "/" + row.depart;
    const group = groups.get(key) || {
      date: row.date_sortie, depart: row.depart, nageurs: 0, observateurs: 0, reservations: [],
    };
    group.nageurs = group.nageurs === null || row.nombre_mise_eau === null ? null : group.nageurs + row.nombre_mise_eau;
    group.observateurs = group.observateurs === null || row.nombre_observateurs === null ? null : group.observateurs + row.nombre_observateurs;
    group.reservations.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.date.localeCompare(b.date) || a.depart.localeCompare(b.depart));
}
