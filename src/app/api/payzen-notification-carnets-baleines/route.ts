import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  DATE_EXPIRATION_CARNETS_BALEINES,
  getOffreCarnetBaleines,
} from "@/lib/carnetsBaleines";
import { sendCarnetBaleinesPurchaseEmails } from "@/lib/carnetsBaleinesEmail";
import { buildCarnetBaleinesInvoicePdf } from "@/lib/carnetsBaleinesInvoice";
import { supabase } from "@/lib/supabase";

function verifierSignature(
  champs: Record<string, string>,
  signatureRecue: string,
  cle: string
) {
  const chaine =
    Object.keys(champs)
      .filter((key) => key.startsWith("vads_"))
      .sort()
      .map((key) => champs[key])
      .join("+") +
    "+" +
    cle;
  const signatureCalculee = crypto
    .createHmac("sha256", cle)
    .update(chaine, "utf8")
    .digest("base64");
  const recue = Buffer.from(signatureRecue);
  const calculee = Buffer.from(signatureCalculee);

  return (
    recue.length === calculee.length &&
    crypto.timingSafeEqual(recue, calculee)
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const champs: Record<string, string> = {};

    formData.forEach((value, key) => {
      champs[key] = String(value);
    });

    const contextMode = String(formData.get("vads_ctx_mode") || "");
    const key =
      contextMode === "PRODUCTION"
        ? process.env.PAYZEN_PRODUCTION_KEY
        : process.env.PAYZEN_TEST_KEY;

    if (
      !key ||
      !verifierSignature(
        champs,
        String(formData.get("signature") || ""),
        key
      )
    ) {
      return NextResponse.json(
        { ok: false, error: "Signature PayZen invalide." },
        { status: 400 }
      );
    }

    const statutPaiement = String(
      formData.get("vads_trans_status") || ""
    );

    if (statutPaiement !== "AUTHORISED") {
      return NextResponse.json({
        ok: true,
        message: "Paiement non autorisé.",
      });
    }

    const carnetId = String(
      formData.get("vads_ext_info_carnet_id") ||
        formData.get("vads_order_id") ||
        ""
    );

    if (!carnetId) {
      return NextResponse.json(
        { ok: false, error: "Identifiant carnet manquant." },
        { status: 400 }
      );
    }

    const carnetResponse = await supabase
      .from("carnets_baleines")
      .select(
        "id,code,type_carnet,prix,prenom_acheteur,nom_acheteur,email,statut,paiement_effectue,transaction_id,email_sent"
      )
      .eq("id", carnetId)
      .maybeSingle();

    if (carnetResponse.error || !carnetResponse.data) {
      return NextResponse.json(
        { ok: false, error: "Carnet introuvable." },
        { status: 404 }
      );
    }

    const carnet = carnetResponse.data;
    const offre = getOffreCarnetBaleines(Number(carnet.type_carnet));
    const montantRecu = Number(formData.get("vads_amount") || 0);
    const typeRecu = Number(
      formData.get("vads_ext_info_type_carnet") || 0
    );
    const transactionReference = `${String(
      formData.get("vads_trans_date") || ""
    )}-${String(formData.get("vads_trans_id") || "")}`;

    if (
      !offre ||
      offre.credits !== typeRecu ||
      offre.prix !== montantRecu ||
      Number(carnet.prix) !== offre.prix ||
      String(formData.get("vads_ext_info_activity") || "") !==
        "carnets_baleines" ||
      String(formData.get("vads_ext_info_reservation_table") || "") !==
        "carnets_baleines"
    ) {
      return NextResponse.json(
        { ok: false, error: "Données de paiement incohérentes." },
        { status: 409 }
      );
    }

    if (
      carnet.transaction_id &&
      carnet.transaction_id !== transactionReference
    ) {
      return NextResponse.json(
        { ok: false, error: "Transaction déjà attribuée." },
        { status: 409 }
      );
    }

    if (carnet.paiement_effectue && carnet.email_sent) {
      return NextResponse.json({
        ok: true,
        message: "Carnet déjà activé et e-mails déjà envoyés.",
      });
    }

    if (!carnet.paiement_effectue) {
      const activation = await supabase
        .from("carnets_baleines")
        .update({
          paiement_effectue: true,
          statut: "actif",
          credits_initiaux: offre.credits,
          credits_restants: offre.credits,
          date_expiration: DATE_EXPIRATION_CARNETS_BALEINES,
          transaction_id: transactionReference,
          paid_at: new Date().toISOString(),
          origine_creation: "payzen",
          mode_paiement: "payzen",
          montant_encaisse: montantRecu,
        })
        .eq("id", carnetId)
        .eq("paiement_effectue", false);

      if (activation.error) {
        return NextResponse.json(
          { ok: false, error: "Impossible d’activer le carnet." },
          { status: 500 }
        );
      }
    }

    const facture = buildCarnetBaleinesInvoicePdf({
      id: String(carnet.id),
      code: String(carnet.code),
      credits: offre.credits,
      nom: String(carnet.nom_acheteur),
      prenom: String(carnet.prenom_acheteur),
      prix: offre.prix,
      dateExpiration: DATE_EXPIRATION_CARNETS_BALEINES,
      modePaiement: "PayZen",
    });
    const invoicePath = `factures/carnets-baleines/${facture.invoiceNumber}.pdf`;
    const upload = await supabase.storage
      .from("documents-permis")
      .upload(invoicePath, facture.pdf, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (upload.error) {
      return NextResponse.json(
        { ok: false, error: "Impossible de générer la facture." },
        { status: 500 }
      );
    }

    const invoiceUpdate = await supabase
      .from("carnets_baleines")
      .update({
        facture_numero: facture.invoiceNumber,
        facture_url: invoicePath,
      })
      .eq("id", carnetId);

    if (invoiceUpdate.error) {
      return NextResponse.json(
        { ok: false, error: "Impossible d’enregistrer la facture." },
        { status: 500 }
      );
    }

    const emailResult = await sendCarnetBaleinesPurchaseEmails({
      carnet: {
        code: String(carnet.code),
        credits: offre.credits,
        dateExpiration: DATE_EXPIRATION_CARNETS_BALEINES,
        email: String(carnet.email),
        nom: String(carnet.nom_acheteur),
        prenom: String(carnet.prenom_acheteur),
        prix: offre.prix,
      },
      invoiceNumber: facture.invoiceNumber,
      invoicePdf: facture.pdf,
    });

    if (!("ok" in emailResult) || !emailResult.ok) {
      const reason =
        ("error" in emailResult && emailResult.error) ||
        ("reason" in emailResult && emailResult.reason) ||
        "Erreur d’envoi";
      console.error("Erreur e-mails Carnet Baleines :", reason);
      return NextResponse.json(
        { ok: false, error: "Impossible d’envoyer les e-mails." },
        { status: 500 }
      );
    }

    const emailUpdate = await supabase
      .from("carnets_baleines")
      .update({
        email_sent: true,
        email_sent_at: new Date().toISOString(),
      })
      .eq("id", carnetId);

    if (emailUpdate.error) {
      return NextResponse.json(
        { ok: false, error: "Statut e-mail non enregistré." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Carnet activé, facture et e-mails envoyés.",
    });
  } catch (error) {
    console.error("Erreur notification PayZen Carnet Baleines :", error);
    return NextResponse.json(
      { ok: false, error: "Erreur serveur." },
      { status: 500 }
    );
  }
}
