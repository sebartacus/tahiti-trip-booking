import { NextResponse } from "next/server";
import {
  getAdminSupabaseClient,
} from "@/lib/adminCarnetsBaleines";
import { verifyAdminSession } from "@/lib/adminSession";
import {
  getModePaiementCarnetLabel,
  getOffreCarnetBaleines,
  MODES_PAIEMENT_CARNET_MANUEL,
} from "@/lib/carnetsBaleines";
import { sendCarnetBaleinesPurchaseEmails } from "@/lib/carnetsBaleinesEmail";
import { buildCarnetBaleinesInvoicePdf } from "@/lib/carnetsBaleinesInvoice";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SQL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MODES_PAIEMENT: ReadonlySet<string> = new Set(
  MODES_PAIEMENT_CARNET_MANUEL.map((mode) => mode.value)
);

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidSqlDate(value: string) {
  if (!SQL_DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export async function POST(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const prenom = text(body.prenom_acheteur);
    const nom = text(body.nom_acheteur);
    const telephone = text(body.telephone);
    const email = text(body.email).toLowerCase();
    const dateExpiration = text(body.date_expiration);
    const modePaiement = text(body.mode_paiement);
    const referencePaiement = text(body.reference_paiement);
    const commentaireInterne = text(body.commentaire_interne);
    const factureRemise = body.facture_remise === true;
    const typeCarnet = Number(body.type_carnet);
    const montantEncaisse = Number(body.montant_encaisse);
    const envoyerEmail = body.envoyer_email === true;
    const offre = getOffreCarnetBaleines(typeCarnet);

    if (!prenom || !nom || !telephone) {
      return NextResponse.json(
        { error: "Le prénom, le nom et le téléphone sont obligatoires." },
        { status: 400 }
      );
    }

    if (
      prenom.length > 100 ||
      nom.length > 100 ||
      telephone.length > 50 ||
      email.length > 254 ||
      referencePaiement.length > 200 ||
      commentaireInterne.length > 1_000
    ) {
      return NextResponse.json(
        { error: "Un ou plusieurs champs sont trop longs." },
        { status: 400 }
      );
    }

    if (email && !EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { error: "L’adresse e-mail est invalide." },
        { status: 400 }
      );
    }

    if (!offre) {
      return NextResponse.json(
        { error: "L’offre sélectionnée est invalide." },
        { status: 400 }
      );
    }

    if (!isValidSqlDate(dateExpiration)) {
      return NextResponse.json(
        { error: "La date d’expiration est invalide." },
        { status: 400 }
      );
    }

    if (!MODES_PAIEMENT.has(modePaiement)) {
      return NextResponse.json(
        { error: "Le mode de paiement est invalide." },
        { status: 400 }
      );
    }

    if (
      !Number.isSafeInteger(montantEncaisse) ||
      montantEncaisse <= 0 ||
      montantEncaisse > 100_000_000
    ) {
      return NextResponse.json(
        { error: "Le montant encaissé doit être supérieur à 0 F CFP." },
        { status: 400 }
      );
    }

    if (envoyerEmail && !email) {
      return NextResponse.json(
        { error: "Un e-mail est requis pour effectuer l’envoi." },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabaseClient();
    const paidAt = new Date();
    const creation = await supabase
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
        date_expiration: dateExpiration,
        statut: "actif",
        paiement_effectue: true,
        paid_at: paidAt.toISOString(),
        mode_paiement: modePaiement,
        reference_paiement: referencePaiement || null,
        montant_encaisse: montantEncaisse,
        origine_creation: "manuel",
        commentaire_interne: commentaireInterne || null,
        facture_remise: factureRemise,
      })
      .select(
        "id,code,prenom_acheteur,nom_acheteur,telephone,email,type_carnet,credits_initiaux,credits_restants,prix,created_at,paid_at,date_expiration,statut,paiement_effectue,mode_paiement,reference_paiement,montant_encaisse,origine_creation,commentaire_interne,facture_remise"
      )
      .single();

    if (creation.error || !creation.data) {
      console.error("Erreur création manuelle carnet Baleines :", creation.error);
      return NextResponse.json(
        { error: "Impossible de créer le carnet." },
        { status: 500 }
      );
    }

    const carnet = creation.data;
    const facture = buildCarnetBaleinesInvoicePdf(
      {
        id: String(carnet.id),
        code: String(carnet.code),
        credits: offre.credits,
        nom,
        prenom,
        prix: montantEncaisse,
        dateExpiration,
        modePaiement: getModePaiementCarnetLabel(modePaiement),
      },
      paidAt
    );
    const invoicePath = `factures/carnets-baleines/${facture.invoiceNumber}.pdf`;
    const upload = await supabase.storage
      .from("documents-permis")
      .upload(invoicePath, facture.pdf, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (upload.error) {
      await supabase.from("carnets_baleines").delete().eq("id", carnet.id);
      console.error("Erreur facture carnet manuel :", upload.error);
      return NextResponse.json(
        { error: "Impossible de générer la facture. Le carnet n’a pas été créé." },
        { status: 500 }
      );
    }

    const invoiceUpdate = await supabase
      .from("carnets_baleines")
      .update({
        facture_numero: facture.invoiceNumber,
        facture_url: invoicePath,
      })
      .eq("id", carnet.id);

    if (invoiceUpdate.error) {
      await supabase.storage.from("documents-permis").remove([invoicePath]);
      await supabase.from("carnets_baleines").delete().eq("id", carnet.id);
      return NextResponse.json(
        { error: "Impossible d’enregistrer la facture. Le carnet n’a pas été créé." },
        { status: 500 }
      );
    }

    let emailWarning: string | null = null;
    let emailSent = false;

    if (envoyerEmail && email) {
      const emailResult = await sendCarnetBaleinesPurchaseEmails({
        carnet: {
          code: String(carnet.code),
          credits: offre.credits,
          dateExpiration,
          email,
          nom,
          prenom,
          prix: montantEncaisse,
        },
        invoiceNumber: facture.invoiceNumber,
        invoicePdf: facture.pdf,
        idempotencySuffix: `${carnet.code}-creation-manuelle`,
      });

      if ("ok" in emailResult && emailResult.ok) {
        emailSent = true;
        await supabase
          .from("carnets_baleines")
          .update({
            email_sent: true,
            email_sent_at: new Date().toISOString(),
          })
          .eq("id", carnet.id);
      } else {
        emailWarning =
          "Le carnet a été créé, mais l’e-mail n’a pas pu être envoyé.";
      }
    }

    return NextResponse.json(
      {
        ok: true,
        warning: emailWarning,
        carnet: {
          ...carnet,
          facture_numero: facture.invoiceNumber,
          facture_url: invoicePath,
          email_sent: emailSent,
          email_sent_at: emailSent ? new Date().toISOString() : null,
          historique: [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur serveur création manuelle carnet Baleines :", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
