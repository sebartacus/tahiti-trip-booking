import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getTahitiToday } from "./tahiti-date";
import { guideMonthBounds, type GuideParticipant, type GuideReservation } from "./guideBaleines";
import { guideConfigured, guideResponseHeaders, verifyGuideRequest } from "./guideBaleinesSession";

export const GUIDE_FIELDS = [
  "date_sortie", "depart", "nombre_mise_eau", "nombre_observateurs",
  "responsable_prenom", "responsable_nom", "responsable_telephone", "participants",
] as const;
const PARTICIPANT_TYPES = new Set([
  "mise_eau", "observateur", "observateur_adulte", "observateur_enfant", "enfant_moins_12", "enfant_moins_5",
]);
const EXCLUDED_STATUSES = "(cancelled,canceled,failed,refused,abandoned,unpaid)";
function text(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : null; }
function count(value: unknown) { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null; }
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function projectGuideParticipant(value: unknown): GuideParticipant {
  const row = record(value);
  const age = typeof row.age === "number" ? row.age :
    typeof row.age === "string" && /^\d{1,3}$/.test(row.age.trim()) ? Number(row.age) : NaN;
  return {
    prenom: text(row.prenom), nom: text(row.nom),
    role: row.role === "mise_eau" || row.role === "observateur" ? row.role : null,
    age: Number.isInteger(age) && age >= 0 && age <= 120 ? age : null,
    type: typeof row.type === "string" && PARTICIPANT_TYPES.has(row.type) ? row.type : null,
    tailleCombinaison: text(row.tailleCombinaison), pointurePalmes: text(row.pointurePalmes),
    materielPerso: typeof row.materielPerso === "boolean" ? row.materielPerso : null,
  };
}
export function projectGuideReservation(value: unknown): GuideReservation {
  const row = record(value);
  return {
    date_sortie: text(row.date_sortie), depart: text(row.depart),
    nombre_mise_eau: count(row.nombre_mise_eau), nombre_observateurs: count(row.nombre_observateurs),
    responsable_prenom: text(row.responsable_prenom), responsable_nom: text(row.responsable_nom),
    responsable_telephone: text(row.responsable_telephone),
    participants: Array.isArray(row.participants) ? row.participants.map(projectGuideParticipant) : [],
  };
}
export function guideReadClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configuration Guide indisponible.");
  const origin = new URL(url).origin;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const requestUrl = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
      if (method !== "GET" || requestUrl.origin !== origin ||
          requestUrl.pathname !== "/rest/v1/reservations_baleines" ||
          requestUrl.searchParams.get("select") !== GUIDE_FIELDS.join(",")) {
        throw new Error("Lecture opérationnelle Baleines uniquement.");
      }
      return fetch(input, { ...init, cache: "no-store" });
    } },
  });
}
export async function readGuideReservations(month: string, now = new Date()) {
  const bounds = guideMonthBounds(month);
  if (!bounds) throw new Error("Mois invalide.");
  const from = [bounds.from, getTahitiToday(now)].sort()[1];
  if (from > bounds.to) return [];
  const db = guideReadClient();
  const rows: GuideReservation[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from("reservations_baleines")
      .select(GUIDE_FIELDS.join(","))
      .gte("date_sortie", from).lte("date_sortie", bounds.to)
      // Filter-only fields: none of these are selected or returned to the browser.
      .or("statut_paiement.is.null,statut_paiement.not.in." + EXCLUDED_STATUSES)
      .or("source_paiement.eq.paiement_externe_a_facturer,paye.eq.true,statut_paiement.in.(paid,paye,deposit_paid)")
      .order("date_sortie").order("depart").order("id").range(offset, offset + 499);
    if (error) throw new Error("Lecture Guide impossible.");
    for (const source of data || []) {
      const row = projectGuideReservation(source);
      // Defensive bounds/slot check even if a backend returns an unexpected row.
      if (row.date_sortie && row.date_sortie >= from && row.date_sortie <= bounds.to &&
          (row.depart === "07:00" || row.depart === "13:15")) rows.push(row);
    }
    if (!data || data.length < 500) break;
  }
  return rows;
}
export async function guidePlanningResponse(request: Request) {
  const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: guideResponseHeaders });
  if (!guideConfigured()) return json({ error: "Accès Guide indisponible." }, 503);
  if (!verifyGuideRequest(request)) return json({ error: "Connexion Guide requise." }, 401);
  const params = new URL(request.url).searchParams;
  const month = params.get("month") || "";
  if ([...params.keys()].some(key => key !== "month") || params.getAll("month").length !== 1 || !guideMonthBounds(month)) {
    return json({ error: "Un mois au format AAAA-MM est requis." }, 400);
  }
  try { return json({ reservations: await readGuideReservations(month) }); }
  catch { return json({ error: "Impossible de charger les sorties. Réessayez." }, 503); }
}
