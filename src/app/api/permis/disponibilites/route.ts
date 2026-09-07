import { NextResponse } from "next/server";
import { getPermisServerClient } from "@/lib/permisServer";
import { datePermis } from "@/lib/permisPlanning";
import { parsePermisSlot } from "@/lib/permisScheduling";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("date");
  const date = value ? datePermis(value) : null;
  if (value !== null && (!date || value !== date)) {
    return NextResponse.json({ error: "Date invalide (AAAA-MM-JJ attendu)." }, { status: 400, headers });
  }
  try {
    const db = getPermisServerClient();
    const blocked = await db.from("examens_bloques").select("date_examen");
    if (blocked.error) throw blocked.error;
    const blockedExams = [...new Set((blocked.data || [])
      .map(row => row.date_examen)
      .filter((v): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && datePermis(v) === v))];
    const occupiedSlots = new Set<string>();
    if (date) {
      const french = date.split("-").reverse().join("/");
      let offset = 0;
      while (true) {
        const result = await db.from("reservations").select("creneau", { count: "exact" })
          .eq("date_cours", french).order("id").range(offset, offset + 999);
        if (result.error) throw result.error;
        for (const row of result.data || []) {
          if (typeof row.creneau === "string" && parsePermisSlot(row.creneau)) occupiedSlots.add(row.creneau.trim());
        }
        offset += result.data?.length || 0;
        if (!result.data?.length || offset >= (result.count ?? offset)) break;
      }
    }
    return NextResponse.json({ blockedExams, occupiedSlots: [...occupiedSlots] }, { headers });
  } catch {
    return NextResponse.json({ error: "Impossible de charger les disponibilités Permis." }, { status: 500, headers });
  }
}
