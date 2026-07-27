import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const code = String(body.code || "").trim().toUpperCase();
    const nombreCredits = Number(body.nombre_credits || 0);
    const reservationId = body.reservation_id
      ? String(body.reservation_id)
      : null;

    if (!code) {
      return NextResponse.json(
        {
          ok: false,
          error: "Code carnet manquant.",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(nombreCredits) || nombreCredits <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Nombre de crédits invalide.",
        },
        { status: 400 }
      );
    }

    const { data: carnet, error: erreurCarnet } = await supabase
      .from("carnets_baleines")
      .select(
        "id, code, credits_restants, date_expiration, statut, paiement_effectue"
      )
      .eq("code", code)
      .maybeSingle();

    if (erreurCarnet) {
      console.error("Erreur lecture carnet :", erreurCarnet);

      return NextResponse.json(
        {
          ok: false,
          error: "Impossible de lire le carnet.",
        },
        { status: 500 }
      );
    }

    if (!carnet) {
      return NextResponse.json(
        {
          ok: false,
          error: "Code carnet invalide.",
        },
        { status: 404 }
      );
    }

    if (!carnet.paiement_effectue || carnet.statut !== "actif") {
      return NextResponse.json(
        {
          ok: false,
          error: "Ce carnet n'est pas actif.",
        },
        { status: 403 }
      );
    }

    const expiration = new Date(
      `${carnet.date_expiration}T23:59:59`
    );

    if (expiration.getTime() < Date.now()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Ce carnet est expiré.",
        },
        { status: 403 }
      );
    }

    const creditsRestants = Number(carnet.credits_restants);

    if (creditsRestants < nombreCredits) {
      return NextResponse.json(
        {
          ok: false,
          error: `Crédits insuffisants. Solde disponible : ${creditsRestants}.`,
        },
        { status: 400 }
      );
    }

    const nouveauSolde = creditsRestants - nombreCredits;

    const { data: carnetMisAJour, error: erreurMaj } = await supabase
      .from("carnets_baleines")
      .update({
        credits_restants: nouveauSolde,
        statut: nouveauSolde === 0 ? "epuise" : "actif",
      })
      .eq("id", carnet.id)
      .eq("statut", "actif")
      .select("id")
      .maybeSingle();

    if (erreurMaj) {
      console.error("Erreur débit carnet :", erreurMaj);

      return NextResponse.json(
        {
          ok: false,
          error: "Impossible de débiter le carnet.",
        },
        { status: 500 }
      );
    }

    if (!carnetMisAJour) {
      return NextResponse.json(
        {
          ok: false,
          error: "Ce carnet n'est plus actif.",
        },
        { status: 409 }
      );
    }

    const { error: erreurMouvement } = await supabase
      .from("mouvements_carnets_baleines")
      .insert({
        carnet_id: carnet.id,
        reservation_id: reservationId,
        mouvement: -nombreCredits,
        motif: "Réservation sortie baleines",
      });

    if (erreurMouvement) {
      console.error(
        "Erreur historique mouvement carnet :",
        erreurMouvement
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Le débit a été effectué mais l'historique n'a pas pu être enregistré.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      carnet: {
        code: carnet.code,
        credits_utilises: nombreCredits,
        credits_restants: nouveauSolde,
      },
    });
  } catch (error) {
    console.error("Erreur API utilisation carnet :", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Erreur serveur.",
      },
      { status: 500 }
    );
  }
}
