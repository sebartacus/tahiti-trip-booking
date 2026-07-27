import crypto from "crypto";
import { NextResponse } from "next/server";
import { getOffreCarnetBaleines } from "@/lib/carnetsBaleines";
import { supabase } from "@/lib/supabase";

function signerPayzen(champs: Record<string, string>, cle: string) {
  const chaine =
    Object.keys(champs)
      .filter((key) => key.startsWith("vads_"))
      .sort()
      .map((key) => champs[key])
      .join("+") +
    "+" +
    cle;

  return crypto
    .createHmac("sha256", cle)
    .update(chaine, "utf8")
    .digest("base64");
}

function getBaseUrl(request: Request) {
  const requestUrl = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol =
    request.headers.get("x-forwarded-proto") ||
    requestUrl.protocol.replace(":", "");

  return host ? `${protocol}://${host}` : requestUrl.origin;
}

function formatPayzenDate(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
    String(date.getUTCHours()).padStart(2, "0"),
    String(date.getUTCMinutes()).padStart(2, "0"),
    String(date.getUTCSeconds()).padStart(2, "0"),
  ].join("");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const carnetId =
      typeof body.carnet_id === "string" ? body.carnet_id.trim() : "";

    if (!carnetId) {
      return NextResponse.json(
        { error: "Identifiant carnet manquant." },
        { status: 400 }
      );
    }

    const carnetResponse = await supabase
      .from("carnets_baleines")
      .select(
        "id,code,type_carnet,prix,email,statut,paiement_effectue,date_expiration"
      )
      .eq("id", carnetId)
      .maybeSingle();

    if (carnetResponse.error || !carnetResponse.data) {
      return NextResponse.json(
        { error: "Carnet introuvable." },
        { status: 404 }
      );
    }

    const carnet = carnetResponse.data;
    const offre = getOffreCarnetBaleines(Number(carnet.type_carnet));

    if (
      !offre ||
      Number(carnet.prix) !== offre.prix ||
      carnet.paiement_effectue ||
      carnet.statut !== "en_attente"
    ) {
      return NextResponse.json(
        { error: "Ce carnet ne peut pas être payé." },
        { status: 409 }
      );
    }

    const siteId = process.env.NEXT_PUBLIC_PAYZEN_SITE_ID;
    const productionKey = process.env.PAYZEN_PRODUCTION_KEY;
    const testKey = process.env.PAYZEN_TEST_KEY;
    const key = productionKey || testKey;
    const contextMode = productionKey ? "PRODUCTION" : "TEST";

    if (!siteId || !key) {
      return NextResponse.json(
        { error: "Configuration PayZen manquante." },
        { status: 500 }
      );
    }

    const baseUrl = getBaseUrl(request);
    const champs: Record<string, string> = {
      vads_action_mode: "INTERACTIVE",
      vads_amount: String(offre.prix),
      vads_ctx_mode: contextMode,
      vads_currency: "953",
      vads_cust_email: String(carnet.email),
      vads_ext_info_activity: "carnets_baleines",
      vads_ext_info_carnet_code: String(carnet.code),
      vads_ext_info_carnet_id: String(carnet.id),
      vads_ext_info_reservation_table: "carnets_baleines",
      vads_ext_info_type_carnet: String(offre.credits),
      vads_order_id: String(carnet.id),
      vads_page_action: "PAYMENT",
      vads_payment_config: "SINGLE",
      vads_site_id: siteId,
      vads_trans_date: formatPayzenDate(new Date()),
      vads_trans_id: Date.now().toString().slice(-6),
      vads_url_check: new URL(
        "/api/payzen-notification-carnets-baleines",
        baseUrl
      ).toString(),
      vads_url_return: new URL(
        `/carnets-baleines/success?carnetId=${encodeURIComponent(carnet.id)}`,
        baseUrl
      ).toString(),
      vads_version: "V2",
    };

    return NextResponse.json({
      url: "https://secure.payzen.eu/vads-payment/",
      champs: {
        ...champs,
        signature: signerPayzen(champs, key),
      },
    });
  } catch (error) {
    console.error("Erreur PayZen carnets Baleines :", error);
    return NextResponse.json(
      { error: "Erreur serveur." },
      { status: 500 }
    );
  }
}
