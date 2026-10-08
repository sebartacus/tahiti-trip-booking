import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getPermisServerClient } from "@/lib/permisServer";
import { permisExamOptions, validPermisIso } from "@/lib/permisRepriseCalendar";
import { datePermis, type PermisDossier } from "@/lib/permisPlanning";
import { permisReexamenProblem } from "@/lib/permisReexamen";
import { getTahitiToday } from "@/lib/tahiti-date";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(request)) return fail("Accès admin refusé.", 401);
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return fail("Origine refusée.", 403);
  const { id } = await context.params;
  if (!/^[1-9]\d*$/.test(id)) return fail("Identifiant invalide.", 400);
  let body: { examen: string; expectedExamen: string };
  try {
    body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key => !["examen", "expectedExamen"].includes(key)) || typeof body.examen !== "string" || !validPermisIso(body.examen) || typeof body.expectedExamen !== "string" || body.expectedExamen.length > 100) throw new Error();
  } catch { return fail("Demande de réinscription invalide.", 400); }
  try {
    const today = getTahitiToday();
    if (!permisExamOptions(today, true).includes(body.examen)) return fail("Session indisponible, calendrier non renseigné ou délai de huit jours dépassé.", 409);
    const db = getPermisServerClient();
    const result = await db.from("reservations").select("id,prenom,nom,prenom2,nom2,examen,statut,archived").eq("id", id).maybeSingle();
    if (result.error) throw result.error;
    const row = result.data as PermisDossier | null;
    if (!row) return fail("Dossier Permis introuvable.", 404);
    const problem = permisReexamenProblem(row, today);
    if (problem) return fail(problem, 409);
    if (row.examen !== body.expectedExamen) return fail("La date d’examen a changé. Rechargez le dossier.", 409);
    // The RPC rechecks the dossier and blocked sessions under locks, and writes
    // the exam + history together. Never fall back to a non-atomic UPDATE.
    const saved = await db.rpc("permis_reinscrire_examen", {
      p_reservation_id: id, p_expected_examen: body.expectedExamen,
      p_ancienne_date: datePermis(row.examen), p_nouvelle_date: body.examen,
    });
    if (saved.error) {
      if (saved.error.code === "PGRST202" || saved.error.code === "42883" || saved.error.code === "42P01") return fail("Réinscription indisponible : la migration dédiée doit être appliquée par l’administrateur.", 503);
      throw saved.error;
    }
    if (saved.data?.status !== "changed") {
      const messages: Record<string, string> = {
        stale: "Le dossier a changé. Rechargez-le avant de réessayer.",
        double: "Dossier à deux participants : réinscription individuelle impossible ; aucun participant déplacé.",
        unavailable: "Dossier archivé, introuvable ou permis déjà obtenu.",
        blocked: "Cette session d’examen vient d’être bloquée.",
        invalid: "L’examen précédent doit être passé et la nouvelle session respecter le délai de huit jours.",
      };
      return fail(messages[saved.data?.status] || "Réinscription non confirmée. Rechargez le dossier.", 409);
    }
    return NextResponse.json({ ok: true, examen: saved.data.examen }, { headers });
  } catch { return fail("Impossible de confirmer la réinscription. Rechargez le dossier avant de réessayer.", 503); }
}
