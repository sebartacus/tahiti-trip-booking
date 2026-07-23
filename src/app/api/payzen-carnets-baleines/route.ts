import { NextResponse } from "next/server";
import crypto from "crypto";

function signerPayzen(champs: Record<string, string>, cle: string) {
  const champsVads = Object.keys(champs)
    .filter((key) => key.startsWith("vads_"))
    .sort();

  const chaine =
    champsVads.map((key) => champs[key]).join("+") + "+" + cle;

  return crypto
    .createHmac("sha256", cle)
    .update(chaine, "utf8")
    .digest("base64");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const montant = Number(body.montant || 0);
    const email = String(body.email || "");
    const carnetId = String(body.carnet_id || "");
    const carnetCode = String(body.carnet_code || "");
    const typeCarnet = String(body.type_carnet || "");

    if (!montant || montant <= 0) {
      return NextResponse.json(
        { error: "Montant invalide" },
        { status: 400 }
      );
    }

    if (!email || !carnetId || !carnetCode || !typeCarnet) {
      return NextResponse.json(
        { error: "Informations du carnet incomplètes" },
        { status: 400 }
      );
    }

    const siteId = process.env.NEXT_PUBLIC_PAYZEN_SITE_ID;
    const cleTest = process.env.PAYZEN_TEST_KEY;

    if (!siteId || !cleTest) {
      return NextResponse.json(
        { error: "Configuration PayZen manquante" },
        { status: 500 }
      );
    }

    const transactionId = Date.now().toString().slice(-6);

    const date = new Date();

    const annee = date.getUTCFullYear();
    const mois = String(date.getUTCMonth() + 1).padStart(2, "0");
    const jour = String(date.getUTCDate()).padStart(2, "0");
    const heures = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const secondes = String(date.getUTCSeconds()).padStart(2, "0");

    const champs: Record<string, string> = {
      vads_action_mode: "INTERACTIVE",
      vads_amount: String(montant),
      vads_ctx_mode: "TEST",
      vads_currency: "953",
      vads_cust_email: email,

      vads_ext_info_carnet_code: carnetCode,
      vads_ext_info_carnet_id: carnetId,
      vads_ext_info_type_carnet: typeCarnet,

      vads_page_action: "PAYMENT",
      vads_payment_config: "SINGLE",
      vads_site_id: siteId,

      vads_trans_date:
        `${annee}${mois}${jour}${heures}${minutes}${secondes}`,

      vads_trans_id: transactionId,

      vads_url_check:
        "https://tahiti-trip-booking.vercel.app/api/payzen-notification-carnets-baleines",

      vads_url_return:
        `https://tahiti-trip-booking.vercel.app/carnets-baleines/success?code=${encodeURIComponent(
          carnetCode
        )}&credits=${encodeURIComponent(typeCarnet)}`,

      vads_version: "V2",
    };

    const signature = signerPayzen(champs, cleTest);

    return NextResponse.json({
      url: "https://secure.payzen.eu/vads-payment/",
      champs: {
        ...champs,
        signature,
      },
    });
  } catch (error) {
    console.error("Erreur PayZen carnets baleines :", error);

    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}