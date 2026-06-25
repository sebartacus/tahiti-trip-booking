import { NextResponse } from "next/server";
import crypto from "crypto";

function signerPayzen(champs: Record<string, string>, cle: string) {
    const ordre = [
  "vads_action_mode",
  "vads_amount",
  "vads_ctx_mode",
  "vads_currency",
  "vads_cust_email",
  "vads_ext_reservation_id",
  "vads_ext_type",
  "vads_order_id",
  "vads_page_action",
  "vads_payment_config",
  "vads_site_id",
  "vads_trans_date",
  "vads_trans_id",
  "vads_url_check",
  "vads_url_return",
  "vads_version",
];

  const chaine = ordre
    .map((key) => champs[key])
    .join("+") + "+" + cle;

  return crypto
  .createHmac("sha256", cle)
  .update(chaine, "utf8")
  .digest("base64");
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

  const champs: Record<string, string> = {
    vads_action_mode: "INTERACTIVE",
    vads_amount: String(montant),
    vads_ctx_mode: "TEST",
    vads_currency: "953",
vads_cust_email: String(body.email || ""),
vads_ext_type: String(body.type || "permis"),
vads_ext_reservation_id: String(body.reservationId || ""),    
vads_page_action: "PAYMENT",
    vads_payment_config: "SINGLE",
vads_order_id: String(body.orderId || transactionId),    
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
vads_url_return: "https://tahiti-trip-booking.vercel.app/paiement-retour",
vads_url_check: "https://tahiti-trip-booking.vercel.app/api/payzen-notification",
};

  const signature = signerPayzen(champs, cleTest);

  return NextResponse.json({
    url: "https://secure.payzen.eu/vads-payment/",
    champs: {
      ...champs,
      signature,
    },
  });
}