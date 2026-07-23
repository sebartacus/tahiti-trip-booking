import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";

function verifierSignature(
  champs: Record<string, string>,
  signatureRecue: string,
  cle: string
) {
  const champsVads = Object.keys(champs)
    .filter((key) => key.startsWith("vads_"))
    .sort();

  const chaine =
    champsVads.map((key) => champs[key]).join("+") + "+" + cle;

  const signatureCalculee = crypto
    .createHmac("sha256", cle)
    .update(chaine, "utf8")
    .digest("base64");

  return signatureCalculee === signatureRecue;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const champs: Record<string, string> = {};

    formData.forEach((value, key) => {
      champs[key] = String(value);
    });

    const signatureRecue = String(formData.get("signature") || "");

    const cleTest = process.env.PAYZEN_TEST_KEY;

    if (!cleTest) {
      console.error("Clé PayZen manquante");

      return NextResponse.json(
        {
          ok: false,
          error: "Configuration PayZen manquante",
        },
        { status: 500 }
      );
    }

    const signatureValide = verifierSignature(
      champs,
      signatureRecue,
      cleTest
    );

    if (!signatureValide) {
      console.error("Signature PayZen invalide");

      return NextResponse.json(
        {
          ok: false,
          error: "Signature invalide",
        },
        { status: 400 }
      );
    }

    const statutPaiement = String(
      formData.get("vads_trans_status") || ""
    );

    const transactionId = String(
      formData.get("vads_trans_id") || ""
    );

    const carnetId = String(
      formData.get("vads_ext_info_carnet_id") || ""
    );

    const carnetCode = String(
      formData.get("vads_ext_info_carnet_code") || ""
    );

    console.log("Notification PayZen carnet baleines reçue", {
      statutPaiement,
      transactionId,
      carnetId,
      carnetCode,
    });

    if (statutPaiement !== "AUTHORISED") {
      return NextResponse.json({
        ok: true,
        message: "Paiement non autorisé",
      });
    }

    if (!carnetId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Identifiant carnet manquant",
        },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("carnets_baleines")
      .update({
        paiement_effectue: true,
        statut: "actif",
      })
      .eq("id", carnetId);

    if (error) {
      console.error(
        "Erreur activation carnet après paiement :",
        error
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Impossible d'activer le carnet",
        },
        { status: 500 }
      );
    }

    console.log("Carnet baleines activé après paiement", {
      carnetId,
      carnetCode,
      transactionId,
    });

    return NextResponse.json({
      ok: true,
      message: "Carnet activé",
    });
  } catch (error) {
    console.error(
      "Erreur notification PayZen carnet baleines :",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Erreur serveur",
      },
      { status: 500 }
    );
  }
}