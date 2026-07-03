import { NextResponse } from "next/server";
import crypto from "crypto";

function signerPayzen(champs: Record<string, string>, cle: string) {
  const ordre = Object.keys(champs)
    .filter((key) => key.startsWith("vads_"))
    .sort();

  const chaine = ordre
    .map((key) => champs[key])
    .join("+") + "+" + cle;

  return crypto
  .createHmac("sha256", cle)
  .update(chaine, "utf8")
  .digest("base64");
}

function getBaseUrl(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost || request.headers.get("host");

  if (host) {
    return `${forwardedProto || requestUrl.protocol.replace(":", "")}://${host}`;
  }

  return requestUrl.origin;
}

export async function POST(request: Request) {
  const body = await request.json();

  const montant = Number(body.montant || 0);

  if (!montant || montant <= 0) {
    return NextResponse.json(
      { error: "Montant invalide" },
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
  const baseUrl = getBaseUrl(request);
  const retourBoutique =
    typeof body.returnUrl === "string" &&
    body.returnUrl.startsWith("/") &&
    !body.returnUrl.startsWith("//")
      ? new URL(body.returnUrl, baseUrl).toString()
      : new URL("/paiement-retour", baseUrl).toString();
  const reservationId =
    typeof body.reservationId === "string" && body.reservationId.trim()
      ? body.reservationId.trim()
      : "";
  const reservationTable =
    typeof body.reservationTable === "string" && body.reservationTable.trim()
      ? body.reservationTable.trim()
      : "";
  const activity =
    typeof body.activity === "string" && body.activity.trim()
      ? body.activity.trim()
      : "";

  const champs: Record<string, string> = {
    vads_action_mode: "INTERACTIVE",
    vads_amount: String(montant),
    vads_ctx_mode: "TEST",
    vads_currency: "953",
    vads_cust_email: String(body.email || ""),
    vads_page_action: "PAYMENT",
    vads_payment_config: "SINGLE",
    vads_site_id: siteId,
    vads_trans_date: (() => {
  const date = new Date();

  const annee = date.getUTCFullYear();
  const mois = String(date.getUTCMonth() + 1).padStart(2, "0");
  const jour = String(date.getUTCDate()).padStart(2, "0");
  const heures = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const secondes = String(date.getUTCSeconds()).padStart(2, "0");

  return `${annee}${mois}${jour}${heures}${minutes}${secondes}`;
})(),
    vads_trans_id: transactionId,
    vads_version: "V2",
    vads_url_return: retourBoutique,
    vads_url_check: "https://tahiti-trip-booking.vercel.app/api/payzen-notification",
  };

  if (reservationId) {
    champs.vads_order_id = reservationId;
  }

  if (reservationTable) {
    champs.vads_ext_info_reservation_table = reservationTable;
  }

  if (activity) {
    champs.vads_ext_info_activity = activity;
  }

  const signature = signerPayzen(champs, cleTest);

  return NextResponse.json({
    url: "https://secure.payzen.eu/vads-payment/",
    champs: {
      ...champs,
      signature,
    },
  });
}
