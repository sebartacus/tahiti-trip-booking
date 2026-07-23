import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      type_carnet,
      prenom_acheteur,
      nom_acheteur,
      email,
      telephone,
    } = body;

    if (![5, 10].includes(type_carnet)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Type de carnet invalide",
        },
        { status: 400 }
      );
    }

    if (!prenom_acheteur || !nom_acheteur || !email) {
      return NextResponse.json(
        {
          ok: false,
          error: "Informations acheteur incomplètes",
        },
        { status: 400 }
      );
    }

    const prix = type_carnet === 5 ? 65000 : 115000;

    const { data, error } = await supabase
      .from("carnets_baleines")
      .insert({
        type_carnet,
        credits_initiaux: type_carnet,
        credits_restants: type_carnet,
        prix,
        prenom_acheteur,
        nom_acheteur,
        email,
        telephone: telephone || null,
        date_expiration: "2026-11-20",
        statut: "actif",
        paiement_effectue: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Erreur création carnet baleines :", error);

      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      carnet: data,
    });
  } catch (error) {
    console.error("Erreur serveur carnets baleines :", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Erreur serveur",
      },
      { status: 500 }
    );
  }
}