import type { SupabaseClient } from "@supabase/supabase-js";
import { datePermis } from "./permisPlanning";

// Read only session dates, never candidate identities. Include sessions beyond
// the four open for registration, and normalize historical date formats.
export async function readPermisExamDays(db: SupabaseClient): Promise<string[]> {
  const days = new Set<string>();
  for (let offset = 0; ; offset += 1000) {
    const result = await db.from("reservations").select("examen").not("examen", "is", null).order("id").range(offset, offset + 999);
    if (result.error) throw new Error("Impossible de charger les sessions d’examen.");
    const rows = result.data || [];
    for (const row of rows) { const day = datePermis(row.examen); if (day) days.add(day); }
    if (rows.length < 1000) return [...days];
  }
}
