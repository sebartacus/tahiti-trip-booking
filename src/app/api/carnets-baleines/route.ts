import { NextResponse } from "next/server";
import {
  DATE_EXPIRATION_CARNETS_BALEINES,
  getOffreCarnetBaleines,
} from "@/lib/carnetsBaleines";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const typeCarnet = Number(body.type_carnet);
    const prenom = String(body.prenom_acheteur || "").trim();
    const nom = String(body.nom_acheteur || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const telephone = String(body.telephone || "").trim();
    const offre = getOffreCarnetBaleines(typeCarnet);

    if (!offre) {
      return NextResponse.json(
        { ok: false, error: "Type de carnet invalide." },
        { status: 400 }
      );
    }

    if (!prenom || !nom || !email || !telephone) {
      return NextResponse.json(
        { ok: false, error: "Toutes les coordonnées sont obligatoires." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("carnets_baleines")
      .insert({
        type_carnet: offre.credits,
        credits_initiaux: offre.credits,
        credits_restants: offre.credits,
        prix: offre.prix,
        prenom_acheteur: prenom,
        nom_acheteur: nom,
        email,
        telephone,
        date_expiration: DATE_EXPIRATION_CARNETS_BALEINES,
        statut: "en_attente",
        paiement_effectue: false,
        origine_creation: "payzen",
        mode_paiement: "payzen",
      })
      .select("id,type_carnet,prix")
      .single();

    if (error || !data) {
      console.error("Erreur création carnet Baleines :", error);
      return NextResponse.json(
        { ok: false, error: "Impossible de préparer le carnet." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, carnet: data });
  } catch (error) {
    console.error("Erreur serveur carnets Baleines :", error);
    return NextResponse.json(
      { ok: false, error: "Erreur serveur." },
      { status: 500 }
    );
  }
}
