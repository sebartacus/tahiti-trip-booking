import { getPermisServerClient } from "@/lib/permisServer";
import { readPermisCandidate, requirePermisCandidate, RepriseError, repriseFailure, repriseJson } from "@/lib/permisRepriseServer";
import { permisAllowedSlots, permisExamOptions, validPermisIso } from "@/lib/permisRepriseCalendar";
import { datePermis } from "@/lib/permisPlanning";
import { permisSlotsOverlap } from "@/lib/permisScheduling";
import { getTahitiToday } from "@/lib/tahiti-date";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const id = requirePermisCandidate(request);
    const day = new URL(request.url).searchParams.get("date");
    if (day !== null && !validPermisIso(day)) throw new RepriseError(400, "Date invalide.");
    const db = getPermisServerClient();
    const row = await readPermisCandidate(id, db);
    const blocked = await db.from("examens_bloques").select("date_examen");
    if (blocked.error) throw new Error("Availability failed");
    const blockedExams = (blocked.data || []).map(r => datePermis(r.date_examen)).filter(Boolean);
    const today = getTahitiToday();
    let slots = day && day >= today ? permisAllowedSlots(day, row.type_cours) : [];
    if (day && slots.length) {
      // Normalize historical date formats and exclude only the authenticated dossier.
      for (let offset = 0; ; ) {
        const result = await db.from("reservations").select("date_cours,creneau", { count: "exact" }).neq("id", id).order("id").range(offset, offset + 999);
        if (result.error) throw new Error("Availability failed");
        const rows = result.data || [];
        for (const other of rows) if (datePermis(other.date_cours) === day) {
          // Incomplete/unrecognized slots fail closed instead of advertising free time.
          slots = slots.filter(slot => !permisSlotsOverlap(slot, other.creneau || ""));
        }
        offset += rows.length;
        if (!rows.length || offset >= (result.count ?? offset)) break;
      }
    }
    return repriseJson({ exams: permisExamOptions(today).filter(day => !blockedExams.includes(day)), slots });
  } catch (error) { return repriseFailure(error); }
}
