import { NextResponse } from "next/server";
import { getAdminSupabaseClient } from "@/lib/adminCarnetsBaleines";
import { verifyAdminSession } from "@/lib/adminSession";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { error: "Identifiant carnet manquant." },
      { status: 400 }
    );
  }

  const supabase = getAdminSupabaseClient();
  const existing = await supabase
    .from("carnets_baleines")
    .select("id,statut")
    .eq("id", id)
    .maybeSingle();

  if (existing.error) {
    console.error("Erreur lecture carnet à annuler :", existing.error);
    return NextResponse.json(
      { error: "Impossible d’annuler le carnet." },
      { status: 500 }
    );
  }

  if (!existing.data) {
    return NextResponse.json({ error: "Carnet introuvable." }, { status: 404 });
  }

  if (existing.data.statut === "cancelled") {
    return NextResponse.json(
      { error: "Ce carnet est déjà annulé." },
      { status: 409 }
    );
  }

  const update = await supabase
    .from("carnets_baleines")
    .update({ statut: "cancelled" })
    .eq("id", id)
    .select("id,statut")
    .single();

  if (update.error) {
    console.error("Erreur annulation carnet Baleines :", update.error);
    return NextResponse.json(
      { error: "Impossible d’annuler le carnet." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, carnet: update.data });
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { error: "Identifiant carnet manquant." },
      { status: 400 }
    );
  }

  const supabase = getAdminSupabaseClient();
  const deletion = await supabase.rpc("admin_delete_carnet_baleines", {
    p_carnet_id: id,
  });

  if (deletion.error) {
    console.error("Erreur suppression carnet Baleines :", deletion.error);
    return NextResponse.json(
      { error: "Impossible de supprimer définitivement le carnet." },
      { status: 500 }
    );
  }

  if (!deletion.data) {
    return NextResponse.json({ error: "Carnet introuvable." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
