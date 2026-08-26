import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getSalonAdminClient } from "@/lib/salonAdmin";
import { getSalonCarnetOffer, getSalonCarnetValidUntil, isSalonPaymentMethod, SALON_PAYMENT_LABELS } from "@/lib/salonSales";
import { buildCarnetBaleinesInvoicePdf } from "@/lib/carnetsBaleinesInvoice";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

export async function POST(request: Request) {
  if (!verifyAdminSession(request)) return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.paymentType === "deposit") return NextResponse.json({ error: "L’acompte est interdit pour les Carnets Baleines." }, { status: 400 });
    const offer = getSalonCarnetOffer(body.offerCode);
    const firstName = text(body.firstName); const lastName = text(body.lastName);
    const phone = text(body.phone); const email = text(body.email).toLowerCase();
    const paymentMethod = body.paymentMethod; const paymentReference = text(body.paymentReference);
    const comment = text(body.comment);
    if (!offer || !firstName || !lastName || !phone) return NextResponse.json({ error: "Informations obligatoires incomplètes." }, { status: 400 });
    if (email && !EMAIL.test(email)) return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
    if (!isSalonPaymentMethod(paymentMethod)) return NextResponse.json({ error: "Moyen de paiement invalide." }, { status: 400 });
    if ([firstName, lastName].some((value) => value.length > 100) || phone.length > 50 || email.length > 254 || paymentReference.length > 200 || comment.length > 1000) return NextResponse.json({ error: "Un ou plusieurs champs sont trop longs." }, { status: 400 });

    const supabase = getSalonAdminClient();
    const { data, error } = await supabase.rpc("create_salon_carnet_baleines_sale", {
      p_offer_code: offer.code, p_label: offer.label, p_credits: offer.credits,
      p_salon_price: offer.price, p_normal_price: offer.normalPrice,
      p_valid_until: getSalonCarnetValidUntil(), p_prenom: firstName, p_nom: lastName,
      p_telephone: phone, p_email: email, p_payment_method: paymentMethod,
      p_payment_reference: paymentReference, p_commentaire: comment,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const created = Array.isArray(data) ? data[0] : data;
    if (!created?.sale_id || !created?.item_id || !created?.carnet_id) throw new Error("Résultat RPC incomplet.");
    const [carnetResult, itemResult] = await Promise.all([
      supabase.from("carnets_baleines").select("id,code,prenom_acheteur,nom_acheteur,type_carnet,montant_encaisse,date_expiration,mode_paiement").eq("id", created.carnet_id).single(),
      supabase.from("salon_sale_items").select("valid_until,total_price").eq("id", created.item_id).single(),
    ]);
    if (carnetResult.error || !carnetResult.data) throw carnetResult.error || new Error("Carnet introuvable.");
    if (itemResult.error || !itemResult.data?.valid_until) throw itemResult.error || new Error("Snapshot Salon introuvable.");
    const carnet = carnetResult.data;
    const invoice = buildCarnetBaleinesInvoicePdf({ id: String(carnet.id), code: String(carnet.code), credits: Number(carnet.type_carnet), nom: String(carnet.nom_acheteur), prenom: String(carnet.prenom_acheteur), prix: Number(itemResult.data.total_price), dateExpiration: String(itemResult.data.valid_until), modePaiement: SALON_PAYMENT_LABELS[paymentMethod] }, new Date(), { salonValidity: true });
    const invoicePath = `factures/salon/${invoice.invoiceNumber}.pdf`;
    const upload = await supabase.storage.from("documents-permis").upload(invoicePath, invoice.pdf, { contentType: "application/pdf", upsert: true });
    if (upload.error) return NextResponse.json({ saleId: created.sale_id, carnetId: created.carnet_id, carnetCode: carnet.code, invoiceNumber: null, emailAvailable: Boolean(email), warning: "Vente et carnet enregistrés. La facture reste en attente de génération." }, { status: 201 });
    const now = new Date().toISOString();
    const [saleUpdate, carnetUpdate] = await Promise.all([
      supabase.from("salon_sales").update({ facture_numero: invoice.invoiceNumber, facture_url: invoicePath, facture_generee_at: now, statut: "paid" }).eq("id", created.sale_id),
      supabase.from("carnets_baleines").update({ facture_numero: invoice.invoiceNumber, facture_url: invoicePath }).eq("id", created.carnet_id),
    ]);
    if (saleUpdate.error || carnetUpdate.error) throw saleUpdate.error || carnetUpdate.error;
    return NextResponse.json({ saleId: created.sale_id, carnetId: created.carnet_id, carnetCode: carnet.code, invoiceNumber: invoice.invoiceNumber, emailAvailable: Boolean(email) }, { status: 201 });
  } catch (error) {
    console.error("Création carnet Baleines Salon", error);
    return NextResponse.json({ error: "Impossible de créer la vente Carnet Baleines." }, { status: 500 });
  }
}
