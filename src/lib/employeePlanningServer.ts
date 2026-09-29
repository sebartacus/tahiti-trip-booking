import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { datePermis } from "./permisPlanning";
import { monthBounds, type EmployeeActivity, type OperationalRow } from "./employeePlanning";
import { employeeConfigured, employeeResponseHeaders, verifyEmployeeRequest } from "./employeePlanningSession";

// Exact allowlists: also project the response, even if a backend unexpectedly returns extra keys.
export const EMPLOYEE_FIELDS = {
  permis: ["date_cours", "creneau", "prenom", "nom", "prenom2", "nom2", "telephone", "examen"],
  baleines: ["date_sortie", "depart", "nombre_mise_eau", "nombre_observateurs", "responsable_prenom", "responsable_nom", "responsable_telephone"],
  peche: ["date_sortie", "formule", "nombre_personnes", "responsable_prenom", "responsable_nom", "responsable_telephone"],
  "peche-nuit": ["date_sortie", "creneau"],
  charter: ["date_debut", "date_fin", "formule", "nombre_personnes", "responsable_prenom", "responsable_nom", "responsable_tel"],
} as const;
const TABLES: Record<EmployeeActivity, string> = {
  permis: "reservations", baleines: "reservations_baleines", peche: "reservations_peche",
  "peche-nuit": "boat_calendar_slots", charter: "reservations_charter",
};
const numbers = new Set(["nombre_personnes", "nombre_mise_eau", "nombre_observateurs"]);
export function projectEmployeeRow(activity: EmployeeActivity, row: Record<string, unknown>): OperationalRow {
  return Object.fromEntries(EMPLOYEE_FIELDS[activity].map(key => [
    key, numbers.has(key)
      ? typeof row[key] === "number" && Number.isFinite(row[key]) && row[key] >= 0 ? row[key] : null
      : typeof row[key] === "string" ? row[key] : null,
  ]));
}
export function employeeReadClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configuration planning absente.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
      if (method !== "GET") throw new Error("Le planning autorise uniquement les lectures.");
      return fetch(input, { ...init, cache: "no-store" });
    } },
  });
}
export async function readEmployeeActivity(activity: EmployeeActivity, month: string) {
  const bounds = monthBounds(month);
  if (!bounds) throw new Error("Mois invalide.");
  const db = employeeReadClient();
  const rows: OperationalRow[] = [];
  // Legacy Permis dates can be ISO, DD/MM/YYYY or French text: normalize before filtering.
  // Paginate in stable id order, without returning/selecting that id.
  for (let offset = 0; ; offset += 500) {
    let query = db.from(TABLES[activity]).select(activity === "peche-nuit" ? "date,slot" : EMPLOYEE_FIELDS[activity].join(",")).order("id").range(offset, offset + 499);
    if (activity === "permis") {
      query = query.or("archived.is.null,archived.eq.false");
    } else if (activity === "peche-nuit") {
      // No reservations_peche_nuit table in the configured database. Read existing operational slots only.
      query = query.eq("activity", "peche_nuit").eq("status", "reserved").gte("date", bounds.from).lte("date", bounds.to);
    } else {
      query = query.not("statut_paiement", "in", "(cancelled,failed)");
      if (activity === "charter") {
        query = query.lte("date_debut", bounds.to).gte("date_fin", bounds.from)
          .or("paye.eq.true,statut_paiement.in.(paid,paye,deposit_paid),reservation_manuelle.eq.true");
      } else {
        query = query.gte("date_sortie", bounds.from).lte("date_sortie", bounds.to);
        const manual = activity === "baleines" ? ",source_paiement.eq.paiement_externe_a_facturer" : "";
        query = query.or("paye.eq.true,statut_paiement.in.(paid,paye,deposit_paid,paiement_externe_a_facturer)" + manual);
      }
    }
    const { data, error } = await query;
    if (error) throw new Error("Lecture du planning impossible.");
    for (const record of data || []) {
      const source = record as unknown as Record<string, unknown>;
      const row = projectEmployeeRow(activity, activity === "peche-nuit"
        ? { date_sortie: source.date, creneau: source.slot === "morning" ? "Créneau bateau matin" : source.slot === "afternoon" ? "Créneau bateau après-midi" : null }
        : source);
      if (activity === "permis") {
        const days = [row.date_cours, row.examen].map(value => datePermis(typeof value === "string" ? value : null));
        if (!days.some(day => day && day >= bounds.from && day <= bounds.to)) continue;
      }
      rows.push(row);
    }
    if (!data || data.length < 500) break;
  }
  return rows;
}
export async function employeeActivityResponse(request: Request, activity: EmployeeActivity) {
  const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: employeeResponseHeaders });
  if (!employeeConfigured()) return json({ error: "Accès équipe indisponible." }, 503);
  if (!verifyEmployeeRequest(request)) return json({ error: "Connexion équipe requise." }, 401);
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some(key => key !== "month") || params.getAll("month").length !== 1 || !monthBounds(params.get("month") || "")) {
    return json({ error: "Un mois au format AAAA-MM est requis." }, 400);
  }
  try {
    return json({ reservations: await readEmployeeActivity(activity, params.get("month")!) });
  } catch {
    return json({ error: "Impossible de charger cette activité. Réessayez." }, 503);
  }
}
