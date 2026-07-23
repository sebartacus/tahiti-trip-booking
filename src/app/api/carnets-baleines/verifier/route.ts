import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

async function verifierCarnet(codeRecu: string) {
  const code = String(codeRecu || "").trim().toUpperCase();

  if (!code) {
    return {
      status: 400,
      resultat: {
        ok: false,
        error: "Veuillez saisir un code carnet.",
      },
    };
  }

  const { data: carnet, error } = await supabase
    .from("carnets_baleines")
    .select(
      "id, code, type_carnet, credits_initiaux, credits_restants, date_expiration, statut, paiement_effectue"
    )
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("Erreur vérification carnet :", error);

    return {
      status: 500,
      resultat: {
        ok: false,
        error: "Impossible de vérifier le carnet.",
      },
    };
  }

  if (!carnet) {
    return {
      status: 404,
      resultat: {
        ok: false,
        error: "Code carnet invalide.",
      },
    };
  }

  if (!carnet.paiement_effectue) {
    return {
      status: 403,
      resultat: {
        ok: false,
        error: "Ce carnet n'est pas activé.",
      },
    };
  }

  if (carnet.statut !== "actif") {
    return {
      status: 403,
      resultat: {
        ok: false,
        error: "Ce carnet n'est plus actif.",
      },
    };
  }

  if (Number(carnet.credits_restants) <= 0) {
    return {
      status: 403,
      resultat: {
        ok: false,
        error: "Ce carnet ne contient plus de crédits.",
      },
    };
  }

  const expiration = new Date(`${carnet.date_expiration}T23:59:59`);

  if (expiration.getTime() < Date.now()) {
    return {
      status: 403,
      resultat: {
        ok: false,
        error: "Ce carnet est expiré.",
      },
    };
  }

  return {
    status: 200,
    resultat: {
      ok: true,
      carnet: {
        code: carnet.code,
        credits_restants: Number(carnet.credits_restants),
        date_expiration: carnet.date_expiration,
      },
    },
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code") || "";

    const { status, resultat } = await verifierCarnet(code);

    return NextResponse.json(resultat, { status });
  } catch (error) {
    console.error("Erreur API vérification carnet :", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Erreur serveur.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { status, resultat } = await verifierCarnet(body.code);

    return NextResponse.json(resultat, { status });
  } catch (error) {
    console.error("Erreur API vérification carnet :", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Erreur serveur.",
      },
      { status: 500 }
    );
  }
}