import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getPermisServerClient } from "@/lib/permisServer";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request) {
  if (!verifyAdminSession(request)) return NextResponse.json({ error: "Accès admin refusé." }, { status: 401, headers });
  try {
    const db = getPermisServerClient();
    const reservations: Record<string, unknown>[] = [];
    let offset = 0;
    while (true) {
      const result = await db.from("reservations").select("*", { count: "exact" })
        .order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(offset, offset + 999);
      if (result.error) throw result.error;
      reservations.push(...(result.data || []));
      offset += result.data?.length || 0;
      if (!result.data?.length || offset >= (result.count ?? offset)) break;
    }
    return NextResponse.json({ reservations }, { headers });
  } catch {
    return NextResponse.json({ error: "Impossible de charger les dossiers Permis." }, { status: 500, headers });
  }
}
