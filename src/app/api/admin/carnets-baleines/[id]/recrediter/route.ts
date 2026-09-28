import { NextResponse } from "next/server";
import { getAdminSupabaseClient } from "@/lib/adminCarnetsBaleines";
import { verifyAdminSession } from "@/lib/adminSession";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Identifiant carnet invalide." }, { status: 400 });
  }
  if (!body || typeof body.nombre_credits !== "number" ||
      !Number.isSafeInteger(body.nombre_credits) ||
      body.nombre_credits < 1 || body.nombre_credits > 2147483647) {
    return NextResponse.json(
      { error: "Le nombre de crédits doit être un entier supérieur ou égal à 1." },
      { status: 400 }
    );
  }
  if (body.motif != null && (typeof body.motif !== "string" || body.motif.length > 1000)) {
    return NextResponse.json({ error: "Motif invalide (1000 caractères maximum)." }, { status: 400 });
  }

  try {
    // Never fall back to the browser/anonymous client for this operation.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Configuration Supabase admin manquante.");
    }
    const { data, error } = await getAdminSupabaseClient().rpc("admin_recredit_carnet_baleines", {
      p_carnet_id: id,
      p_nombre_credits: body.nombre_credits,
      p_motif: body.motif?.trim() || null,
    });
    if (error) {
      if (error.code === "22023" || error.code === "P0002") {
        return NextResponse.json({ error: error.message }, { status: error.code === "P0002" ? 404 : 400 });
      }
      throw error;
    }
    return NextResponse.json({ ok: true, carnet: data });
  } catch (error) {
    console.error("Erreur recrédit manuel carnet Baleines :", error);
    return NextResponse.json({ error: "Impossible de recréditer le carnet." }, { status: 500 });
  }
}
