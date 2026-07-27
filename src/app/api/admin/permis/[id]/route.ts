import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminSession } from "@/lib/adminSession";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PermisAdminAction = "archive" | "restore";

type PermisReservation = {
  id: number;
  paiement_effectue: boolean | null;
  statut: string | null;
  archived: boolean;
  certificat_url: string | null;
  formulaire_url: string | null;
  photo_url: string | null;
  identite_url: string | null;
  facture_url: string | null;
};

function getAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Configuration Supabase admin manquante: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function findReservation(id: string) {
  const supabase = getAdminSupabaseClient();
  const result = await supabase
    .from("reservations")
    .select(
      "id,paiement_effectue,statut,archived,certificat_url,formulaire_url,photo_url,identite_url,facture_url"
    )
    .eq("id", id)
    .maybeSingle();

  return {
    supabase,
    reservation: result.data as PermisReservation | null,
    error: result.error,
  };
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const { supabase, reservation, error } = await findReservation(id);

    if (error) throw error;
    if (!reservation) {
      return NextResponse.json(
        { error: "Réservation Permis introuvable." },
        { status: 404 }
      );
    }
    if (reservation.paiement_effectue !== false) {
      return NextResponse.json(
        { error: "Seule une réservation explicitement non payée peut être supprimée." },
        { status: 409 }
      );
    }

    const deletion = await supabase
      .from("reservations")
      .delete()
      .eq("id", reservation.id)
      .eq("paiement_effectue", false)
      .select("id")
      .maybeSingle();

    if (deletion.error) throw deletion.error;
    if (!deletion.data) {
      return NextResponse.json(
        { error: "La réservation est désormais payée et ne peut plus être supprimée." },
        { status: 409 }
      );
    }

    const documentPaths = [
      reservation.certificat_url,
      reservation.formulaire_url,
      reservation.photo_url,
      reservation.identite_url,
      reservation.facture_url,
    ].filter((path): path is string => Boolean(path));

    if (documentPaths.length > 0) {
      const removal = await supabase.storage
        .from("documents-permis")
        .remove(documentPaths);

      if (removal.error) {
        console.error(
          "Réservation Permis supprimée, mais erreur suppression documents :",
          removal.error
        );
        return NextResponse.json({
          ok: true,
          warning:
            "La réservation a été supprimée, mais certains documents n’ont pas pu être nettoyés.",
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erreur suppression réservation Permis :", error);
    return NextResponse.json(
      { error: "Impossible de supprimer la réservation Permis." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  }

  const { id } = await context.params;
  let body: { action?: unknown };

  try {
    body = (await request.json()) as { action?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const action =
    body.action === "archive" || body.action === "restore"
      ? (body.action as PermisAdminAction)
      : null;

  if (!action) {
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  }

  try {
    const { supabase, reservation, error } = await findReservation(id);

    if (error) throw error;
    if (!reservation) {
      return NextResponse.json(
        { error: "Réservation Permis introuvable." },
        { status: 404 }
      );
    }

    if (action === "archive") {
      if (
        reservation.paiement_effectue !== true ||
        reservation.statut !== "Permis obtenu"
      ) {
        return NextResponse.json(
          {
            error:
              "Seul un dossier payé avec le statut « Permis obtenu » peut être archivé.",
          },
          { status: 409 }
        );
      }

      const update = await supabase
        .from("reservations")
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
        })
        .eq("id", reservation.id)
        .eq("paiement_effectue", true)
        .eq("statut", "Permis obtenu")
        .eq("archived", false)
        .select("id,archived,archived_at")
        .maybeSingle();

      if (update.error) throw update.error;
      if (!update.data) {
        return NextResponse.json(
          { error: "Ce dossier ne peut plus être archivé." },
          { status: 409 }
        );
      }

      return NextResponse.json({ ok: true, reservation: update.data });
    }

    if (!reservation.archived) {
      return NextResponse.json(
        { error: "Ce dossier n’est pas archivé." },
        { status: 409 }
      );
    }

    const update = await supabase
      .from("reservations")
      .update({
        archived: false,
        archived_at: null,
      })
      .eq("id", reservation.id)
      .eq("archived", true)
      .select("id,archived,archived_at")
      .maybeSingle();

    if (update.error) throw update.error;
    if (!update.data) {
      return NextResponse.json(
        { error: "Ce dossier ne peut plus être restauré." },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, reservation: update.data });
  } catch (error) {
    console.error("Erreur archivage réservation Permis :", error);
    return NextResponse.json(
      { error: "Impossible de mettre à jour la réservation Permis." },
      { status: 500 }
    );
  }
}
