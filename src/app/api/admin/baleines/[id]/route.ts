import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminSession } from "@/lib/adminSession";

type RouteContext = { params: Promise<{ id: string }> };
type BaleinesReservation = {
  id: string;
  facture_url: string | null;
};

function getAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configuration Supabase admin manquante.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const supabase = getAdminSupabaseClient();
    const lookup = await supabase
      .from("reservations_baleines")
      .select("id,facture_url")
      .eq("id", id)
      .maybeSingle();

    if (lookup.error) throw lookup.error;
    if (!lookup.data) {
      return NextResponse.json(
        { error: "Réservation Baleines introuvable." },
        { status: 404 }
      );
    }

    const reservation = lookup.data as BaleinesReservation;
    const deletion = await supabase
      .from("reservations_baleines")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (deletion.error) throw deletion.error;
    if (!deletion.data) {
      return NextResponse.json(
        { error: "Réservation Baleines introuvable." },
        { status: 404 }
      );
    }

    const releasedSlots = await supabase
      .from("boat_calendar_slots")
      .update({
        status: "available",
        activity: null,
        reservation_id: null,
        reservation_table: null,
        blocked_reason: null,
        blocked_by: null,
        blocked_at: null,
        expires_at: null,
      })
      .eq("reservation_table", "reservations_baleines")
      .eq("reservation_id", id);

    if (releasedSlots.error) throw releasedSlots.error;

    if (reservation.facture_url) {
      const removal = await supabase.storage
        .from("documents-permis")
        .remove([reservation.facture_url]);
      if (removal.error) {
        console.error(
          "Réservation Baleines supprimée, mais erreur suppression fichier :",
          removal.error
        );
        return NextResponse.json({
          ok: true,
          warning:
            "La réservation a été supprimée, mais son fichier lié n’a pas pu être nettoyé.",
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erreur suppression réservation Baleines :", error);
    return NextResponse.json(
      { error: "Impossible de supprimer la réservation Baleines." },
      { status: 500 }
    );
  }
}
