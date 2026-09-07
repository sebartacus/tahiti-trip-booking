import { getPermisServerClient } from "@/lib/permisServer";
import { boundedBody, readPermisCandidate, requirePermisCandidate, RepriseError, repriseFailure, repriseJson } from "@/lib/permisRepriseServer";
import { validatePermisPlanning } from "@/lib/permisScheduling";
import { permisAllowedSlots, permisExamOptions } from "@/lib/permisRepriseCalendar";
import { getTahitiToday } from "@/lib/tahiti-date";
import { sendPermisPlanningEmail } from "@/lib/permisEmail";
export const runtime = "nodejs";
export async function PATCH(request: Request) {
  try {
    const id = requirePermisCandidate(request, true);
    let patch;
    try { patch = JSON.parse((await boundedBody(request, 2048)).toString("utf8")); }
    catch (error) { if (error instanceof RepriseError) throw error; throw new RepriseError(400, "Requête invalide."); }
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw new RepriseError(400, "Requête invalide.");
    const db = getPermisServerClient();
    const row = await readPermisCandidate(id, db);
    const today = getTahitiToday();
    let planning;
    try { planning = validatePermisPlanning(row, patch, today); }
    catch (error) { throw new RepriseError(400, error instanceof Error ? error.message : "Planning invalide."); }
    const { before, after, changed } = planning;
    if (!changed) return repriseJson({ ok: true, changed: false, planning: after });
    if (after.examen && after.examen !== before.examen && !permisExamOptions(today).includes(after.examen)) throw new RepriseError(400, "Session d’examen indisponible ou délai d’inscription dépassé.");
    if (after.date_cours && (after.date_cours !== before.date_cours || after.creneau !== before.creneau) && !permisAllowedSlots(after.date_cours, row.type_cours).includes(after.creneau!)) throw new RepriseError(400, "Créneau non autorisé.");
    // This RPC requires the unapplied 2B migration. Never fall back to an UPDATE.
    const result = await db.rpc("permis_save_planning", { p_reservation_id: id, p_expected: before, p_patch: patch });
    if (result.error) {
      if (/Blocked exam|Exam registration deadline|Course must precede exam|Past course|Wednesday morning/.test(result.error.message)) throw new RepriseError(409, "Examen ou cours indisponible. Rechargez les disponibilités.");
      throw new Error("Planning save failed");
    }
    const saved = result.data;
    if (saved?.status === "conflict") throw new RepriseError(409, "Ce créneau vient d’être réservé. Choisissez un autre créneau.");
    if (saved?.status === "stale") throw new RepriseError(409, "Votre dossier a été modifié. Rechargez-le avant de réessayer.");
    if (!["changed", "unchanged"].includes(saved?.status)) throw new Error("Invalid save response");
    if (saved.status === "changed") {
      try { await sendPermisPlanningEmail({ reservation: row, before: saved.before, after: saved.after }); }
      catch { console.error("Notification de changement Permis non envoyée."); }
    }
    return repriseJson({ ok: true, changed: saved.status === "changed", planning: saved.after });
  } catch (error) { return repriseFailure(error); }
}
