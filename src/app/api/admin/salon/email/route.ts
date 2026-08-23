import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getSalonAdminClient } from "@/lib/salonAdmin";
import { sendPermisReservationEmails } from "@/lib/permisEmail";

function baseUrl(request: Request) { return new URL(request.url).origin; }
export async function POST(request: Request) {
  if (!verifyAdminSession(request)) return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  const body = await request.json() as { id?: unknown };
  const id = typeof body.id === "string" ? body.id : "";
  const supabase = getSalonAdminClient();
  const sale = await supabase.from("salon_sales").select("id,client_email,facture_numero,facture_url,salon_sale_items(reservation_id)").eq("id", id).single();
  const item = Array.isArray(sale.data?.salon_sale_items) ? sale.data.salon_sale_items[0] : sale.data?.salon_sale_items;
  if (sale.error || !sale.data?.client_email || !sale.data.facture_url || !item?.reservation_id) return NextResponse.json({ error: "Vente, e-mail ou facture indisponible." }, { status: 400 });
  const [reservation, file] = await Promise.all([
    supabase.from("reservations").select("*").eq("id", item.reservation_id).single(),
    supabase.storage.from("documents-permis").download(sale.data.facture_url),
  ]);
  if (reservation.error || !reservation.data || file.error || !file.data) return NextResponse.json({ error: "Impossible de préparer l’e-mail." }, { status: 500 });
  const result = await sendPermisReservationEmails({ reservation: reservation.data, invoicePdf: Buffer.from(await file.data.arrayBuffer()), invoiceNumber: sale.data.facture_numero, baseUrl: baseUrl(request) });
  if (!("ok" in result) || !result.ok) return NextResponse.json({ error: "Impossible d’envoyer la facture." }, { status: 500 });
  const now = new Date().toISOString();
  await Promise.all([
    supabase.from("salon_sales").update({ facture_envoyee_at: now }).eq("id", id),
    supabase.from("reservations").update({ email_sent: true, email_sent_at: now }).eq("id", item.reservation_id),
  ]);
  return NextResponse.json({ ok: true });
}
