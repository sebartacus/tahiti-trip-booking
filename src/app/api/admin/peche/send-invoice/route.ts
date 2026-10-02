import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getSalonAdminClient } from "@/lib/salonAdmin";
import { sendPecheInvoiceEmail } from "@/lib/pecheEmail";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!verifyAdminSession(request)) return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }
  if (!body || typeof body.reservationId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.reservationId)) {
    return NextResponse.json({ error: "Réservation invalide." }, { status: 400 });
  }
  try {
    const client = getSalonAdminClient();
    const { data: reservation, error } = await client.from("reservations_peche")
      .select("id,date_sortie,formule,slots,nombre_personnes,responsable_prenom,responsable_nom,responsable_email,responsable_telephone,montant_paye,facture_numero,facture_url")
      .eq("id", body.reservationId).maybeSingle();
    if (error) throw error;
    if (!reservation) return NextResponse.json({ error: "Réservation Pêche introuvable." }, { status: 404 });
    if (!reservation.facture_numero || !reservation.facture_url) {
      return NextResponse.json({ error: "Aucune facture actuelle à envoyer." }, { status: 409 });
    }
    const email = reservation.responsable_email?.trim();
    if (!email) return NextResponse.json({ error: "Email client manquant." }, { status: 400 });
    // Read only the current reservation path, never archives or client-supplied invoice data.
    const file = await client.storage.from("documents-permis").download(reservation.facture_url);
    if (file.error || !file.data) return NextResponse.json({ error: "Impossible de télécharger la facture actuelle." }, { status: 502 });
    const pdf = Buffer.from(await file.data.arrayBuffer());
    if (pdf.subarray(0, 5).toString() !== "%PDF-") return NextResponse.json({ error: "La facture actuelle n’est pas un PDF valide." }, { status: 502 });
    const result = await sendPecheInvoiceEmail({ reservation, invoicePdf: pdf, invoiceNumber: reservation.facture_numero });
    if (!("ok" in result) || !result.ok) return NextResponse.json({ error: "Impossible d’envoyer la facture par email. Vérifiez la configuration email et réessayez." }, { status: 502 });
    return NextResponse.json({ ok: true, email }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Impossible d’envoyer la facture. Réessayez." }, { status: 500 });
  }
}
