import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getSalonAdminClient } from "@/lib/salonAdmin";
import { BaleinesDeliveryError, deliverBaleinesInvoice } from "@/lib/baleinesInvoiceDelivery";
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
    const result = await deliverBaleinesInvoice(getSalonAdminClient(), body.reservationId);
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossible de générer et envoyer la facture." },
      { status: error instanceof BaleinesDeliveryError ? error.status : 500 });
  }
}

// Read-only availability of a partial delivery after an admin page reload.
export async function GET(request: Request) {
  if (!verifyAdminSession(request)) return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("reservationId") || "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Réservation invalide." }, { status: 400 });
  }
  const result = await getSalonAdminClient().from("baleines_invoice_deliveries")
    .select("state").eq("reservation_id", id).maybeSingle();
  if (result.error) return NextResponse.json({ error: "Statut facture indisponible." }, { status: 502 });
  return NextResponse.json({ retryable: result.data?.state === "failed" }, { headers: { "Cache-Control": "no-store" } });
}
