import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getSalonAdminClient } from "@/lib/salonAdmin";
import { buildPermisInvoicePdf } from "@/lib/permisInvoice";

export async function GET(request: Request) {
  if (!verifyAdminSession(request)) return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  const supabase = getSalonAdminClient();
  const sale = await supabase.from("salon_sales").select("facture_url").eq("id", id).maybeSingle();
  if (sale.error || !sale.data?.facture_url) return NextResponse.json({ error: "Facture indisponible." }, { status: 404 });
  const signed = await supabase.storage.from("documents-permis").createSignedUrl(sale.data.facture_url, 600);
  if (signed.error || !signed.data?.signedUrl) return NextResponse.json({ error: "Impossible d’ouvrir la facture." }, { status: 500 });
  return NextResponse.json({ url: signed.data.signedUrl });
}

export async function POST(request: Request) {
  if (!verifyAdminSession(request)) return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  const body = await request.json() as { id?: unknown };
  const id = typeof body.id === "string" ? body.id : "";
  const supabase = getSalonAdminClient();
  const sale = await supabase.from("salon_sales").select("id,salon_sale_items(reservation_id,valid_until)").eq("id", id).single();
  const item = Array.isArray(sale.data?.salon_sale_items) ? sale.data.salon_sale_items[0] : sale.data?.salon_sale_items;
  if (sale.error || !item?.reservation_id) return NextResponse.json({ error: "Vente Salon introuvable." }, { status: 404 });
  const reservation = await supabase.from("reservations").select("*").eq("id", item.reservation_id).single();
  if (reservation.error || !reservation.data) return NextResponse.json({ error: "Réservation Permis introuvable." }, { status: 404 });
  if (!item.valid_until) return NextResponse.json({ error: "Snapshot de validité introuvable." }, { status: 409 });
  const invoice = buildPermisInvoicePdf(reservation.data, new Date(), { validUntil: item.valid_until });
  const invoicePath = `factures/salon/${invoice.invoiceNumber}.pdf`;
  const upload = await supabase.storage.from("documents-permis").upload(invoicePath, invoice.pdf, { contentType: "application/pdf", upsert: true });
  if (upload.error) return NextResponse.json({ error: "Impossible de générer la facture." }, { status: 500 });
  const now = new Date().toISOString();
  const [saleUpdate, reservationUpdate] = await Promise.all([
    supabase.from("salon_sales").update({ facture_numero: invoice.invoiceNumber, facture_url: invoicePath, facture_generee_at: now, statut: "paid" }).eq("id", id),
    supabase.from("reservations").update({ facture_numero: invoice.invoiceNumber, facture_url: invoicePath }).eq("id", item.reservation_id),
  ]);
  if (saleUpdate.error || reservationUpdate.error) return NextResponse.json({ error: "Facture créée, mais son état n’a pas pu être enregistré." }, { status: 500 });
  return NextResponse.json({ invoiceNumber: invoice.invoiceNumber });
}
