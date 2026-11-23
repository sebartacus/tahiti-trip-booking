import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getPermisServerClient } from "@/lib/permisServer";
import { validPermisIso } from "@/lib/permisRepriseCalendar";

export const dynamic = "force-dynamic";

function json(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

const denied = () => json({ error: "Accès admin refusé." }, 401);
const failed = () => json({ error: "Impossible de gérer les indisponibilités. Réessayez." }, 503);
const invalid = () => json({ error: "Vérifiez les dates, les horaires et le motif." }, 400);

export async function GET(request: Request) {
  if (!verifyAdminSession(request)) return denied();
  try {
    const db = getPermisServerClient();
    const blocages = [];
    for (let offset = 0; ; ) {
      const result = await db.from("permis_indisponibilites")
        .select("id,date_debut,date_fin,debut_minute,fin_minute,motif", { count: "exact" })
        .order("date_debut", { ascending: false }).order("id").range(offset, offset + 999);
      if (result.error) throw result.error;
      blocages.push(...result.data);
      offset += result.data.length;
      if (!result.data.length || offset >= (result.count ?? offset)) return json({ blocages });
    }
  } catch {
    return failed();
  }
}

function timeInMinutes(value: unknown) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function POST(request: Request) {
  if (!verifyAdminSession(request)) return denied();
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return invalid();
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return invalid();
  const { mode, dateDebut, dateFin, heureDebut, heureFin, motif } = body;
  if (typeof dateDebut !== "string" || !validPermisIso(dateDebut)
      || !["horaire", "journee", "periode"].includes(mode)
      || (motif != null && (typeof motif !== "string" || motif.trim().length > 500))) return invalid();
  const endDate = mode === "periode" ? dateFin : dateDebut;
  if (typeof endDate !== "string" || !validPermisIso(endDate)
      || (mode === "periode" && endDate <= dateDebut)) return invalid();
  const start = mode === "horaire" ? timeInMinutes(heureDebut) : null;
  const end = mode === "horaire" ? timeInMinutes(heureFin) : null;
  if (mode === "horaire" && (start === null || end === null || end <= start)) return invalid();

  try {
    const result = await getPermisServerClient().rpc("permis_add_indisponibilite", {
      p_date_debut: dateDebut, p_date_fin: endDate, p_debut_minute: start,
      p_fin_minute: end, p_motif: motif?.trim() || null,
    });
    if (result.error) throw result.error;
    return json(result.data, 201);
  } catch {
    return failed();
  }
}

export async function DELETE(request: Request) {
  if (!verifyAdminSession(request)) return denied();
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)) return invalid();
  try {
    const result = await getPermisServerClient().from("permis_indisponibilites").delete().eq("id", id);
    if (result.error) throw result.error;
    return json({ ok: true });
  } catch {
    return failed();
  }
}
