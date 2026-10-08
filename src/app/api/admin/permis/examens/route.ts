import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getPermisServerClient } from "@/lib/permisServer";
import { permisExamOptions, permisExamCalendarWarnings } from "@/lib/permisRepriseCalendar";
import { datePermis } from "@/lib/permisPlanning";
import { getTahitiToday } from "@/lib/tahiti-date";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  if (!verifyAdminSession(request)) return NextResponse.json({ error: "Accès admin refusé." }, { status: 401, headers });
  try {
    const today = getTahitiToday();
    const blocked = await getPermisServerClient().from("examens_bloques").select("date_examen");
    if (blocked.error) throw blocked.error;
    const excluded = new Set((blocked.data || []).map(row => datePermis(row.date_examen)));
    return NextResponse.json({ exams: permisExamOptions(today, true).filter(day => !excluded.has(day)), warnings: permisExamCalendarWarnings(today) }, { headers });
  } catch {
    return NextResponse.json({ error: "Impossible de charger les sessions d’examen. Réessayez." }, { status: 503, headers });
  }
}
