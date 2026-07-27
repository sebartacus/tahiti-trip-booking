import { NextResponse } from "next/server";
import {
  getAdminSupabaseClient,
} from "@/lib/adminCarnetsBaleines";
import { verifyAdminSession } from "@/lib/adminSession";
import { getModePaiementCarnetLabel } from "@/lib/carnetsBaleines";
import { sendCarnetBaleinesPurchaseEmails } from "@/lib/carnetsBaleinesEmail";
import { buildCarnetBaleinesInvoicePdf } from "@/lib/carnetsBaleinesInvoice";

export async function POST(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  }

  const supabase = getAdminSupabaseClient();
  const body = await request.json();
  const carnetId =
    typeof body.id === "string" ? body.id.trim() : "";

  if (!carnetId) {
    return NextResponse.json(
      { error: "Identifiant carnet manquant." },
      { status: 400 }
    );
  }

  const carnetResponse = await supabase
    .from("carnets_baleines")
    .select(
      "id,code,prenom_acheteur,nom_acheteur,email,type_carnet,prix,date_expiration,statut,paiement_effectue,mode_paiement,montant_encaisse"
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

  if (!carnet.paiement_effectue || carnet.statut !== "actif") {
    return NextResponse.json(
      { error: "Seul un carnet actif peut être renvoyé." },
      { status: 409 }
    );
  }

  if (!String(carnet.email || "").trim()) {
    return NextResponse.json(
      { error: "Aucune adresse e-mail n’est renseignée pour ce carnet." },
      { status: 400 }
    );
  }

  const facture = buildCarnetBaleinesInvoicePdf({
    id: String(carnet.id),
    code: String(carnet.code),
    credits: Number(carnet.type_carnet),
    nom: String(carnet.nom_acheteur),
    prenom: String(carnet.prenom_acheteur),
    prix: Number(carnet.montant_encaisse ?? carnet.prix),
    dateExpiration: String(carnet.date_expiration),
    modePaiement: getModePaiementCarnetLabel(carnet.mode_paiement),
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
      { error: "Impossible de préparer la facture." },
      { status: 500 }
    );
  }

  const emailResult = await sendCarnetBaleinesPurchaseEmails({
    carnet: {
      code: String(carnet.code),
      credits: Number(carnet.type_carnet),
      dateExpiration: String(carnet.date_expiration),
      email: String(carnet.email),
      nom: String(carnet.nom_acheteur),
      prenom: String(carnet.prenom_acheteur),
      prix: Number(carnet.montant_encaisse ?? carnet.prix),
    },
    invoiceNumber: facture.invoiceNumber,
    invoicePdf: facture.pdf,
    idempotencySuffix: `${carnet.code}-renvoi-${Date.now()}`,
  });

  if (!("ok" in emailResult) || !emailResult.ok) {
    return NextResponse.json(
      { error: "Impossible de renvoyer le carnet." },
      { status: 500 }
    );
  }

  const update = await supabase
    .from("carnets_baleines")
    .update({
      facture_numero: facture.invoiceNumber,
      facture_url: invoicePath,
      email_sent: true,
      email_sent_at: new Date().toISOString(),
    })
    .eq("id", carnetId);

  if (update.error) {
    return NextResponse.json(
      { error: "E-mail envoyé, mais statut non enregistré." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
