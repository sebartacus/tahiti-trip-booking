export type PermisDossier = {
  id: string | number;
  prenom?: string | null; nom?: string | null;
  prenom2?: string | null; nom2?: string | null;
  telephone?: string | null; examen?: string | null;
  date_cours?: string | null; creneau?: string | null;
  origine_reservation?: string | null; statut?: string | null;
  archived?: boolean | null;
  certificat_url?: string | null; formulaire_url?: string | null;
  photo_url?: string | null; identite_url?: string | null;
};

const clean = (value?: string | null) => (value || "").trim();
export function sansExamen(value?: string | null) {
  return !clean(value) || clean(value).toLocaleLowerCase("fr") === "plus tard";
}
export function originePermis(value?: string | null) {
  return value === "salon" || value === "salon_admin" ? "Salon" : value === "site" ? "Site" : "Non renseignée";
}
export function candidatsPermis(row: PermisDossier) {
  const names = [[row.prenom, row.nom].map(clean).filter(Boolean).join(" ") || "Identité non renseignée"];
  if (clean(row.prenom2) || clean(row.nom2)) names.push([row.prenom2, row.nom2].map(clean).filter(Boolean).join(" "));
  return names;
}
export function piecesPermis(row: PermisDossier) {
  return [row.certificat_url, row.formulaire_url, row.photo_url, row.identite_url].filter(value => clean(value)).length;
}
const months = ["janvier","fevrier","mars","avril","mai","juin","juillet","aout","septembre","octobre","novembre","decembre"];
const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
export function datePermis(value?: string | null): string | null {
  if (sansExamen(value)) return null;
  const raw = fold(clean(value));
  let year: number, month: number, day: number;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const numeric = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const french = raw.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (iso) [, year, month, day] = iso.map(Number);
  else if (numeric) { day = Number(numeric[1]); month = Number(numeric[2]); year = Number(numeric[3]); }
  else if (french) { day = Number(french[1]); month = months.indexOf(french[2]) + 1; year = Number(french[3]); }
  else return null;
  if (year < 1000 || month < 1 || month > 12 || day < 1) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}
export function afficherDatePermis(value?: string | null) {
  if (sansExamen(value)) return "À choisir";
  const iso = datePermis(value);
  return iso ? new Intl.DateTimeFormat("fr-FR", {day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(iso + "T12:00:00Z")) : `Date non reconnue : ${clean(value)}`;
}
export type FiltrePermis = "sansDates" | "sansExamen" | "sansCours" | "incomplets";
export function correspondFiltre(row: PermisDossier, filter: FiltrePermis) {
  const exam = sansExamen(row.examen), course = !clean(row.date_cours);
  return filter === "sansDates" ? exam && course : filter === "sansExamen" ? exam : filter === "sansCours" ? course : piecesPermis(row) < 4;
}
export function compteursPermis(rows: PermisDossier[]) {
  const result = {sansDates:0,sansExamen:0,sansCours:0,incomplets:0};
  for (const row of rows.filter(r => !r.archived)) {
    for (const key of Object.keys(result) as FiltrePermis[]) if (correspondFiltre(row,key)) result[key] += key === "incomplets" ? 1 : candidatsPermis(row).length;
  }
  return result;
}
export function rechercherPermis(row: PermisDossier, query: string) {
  const names = fold(candidatsPermis(row).join(" "));
  return fold(query).split(/\s+/).every(token => names.includes(token));
}
function slotStart(value?: string | null) {
  const match = clean(value).match(/^(\d{1,2})[h:](\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.POSITIVE_INFINITY;
}
export function groupesPermis(rows: PermisDossier[], kind: "examen" | "cours", today: string) {
  const groups = new Map<string, {date:string; creneau:string; dossiers:PermisDossier[]}>();
  for (const row of rows) {
    if (row.archived) continue;
    const date = datePermis(kind === "examen" ? row.examen : row.date_cours);
    if (!date || date < today) continue;
    const creneau = kind === "cours" ? clean(row.creneau) : "";
    const key = date + "|" + creneau;
    const group = groups.get(key) || {date,creneau,dossiers:[]};
    group.dossiers.push(row); groups.set(key,group);
  }
  return [...groups.values()].sort((a,b) => a.date.localeCompare(b.date) || (slotStart(a.creneau) - slotStart(b.creneau)) || a.creneau.localeCompare(b.creneau));
}
