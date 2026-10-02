import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getPermisServerClient } from "@/lib/permisServer";
import { markManualPermisPaid, PermisPaymentError } from "@/lib/permisManualPayment";

export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(request)) return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  const { id } = await context.params;
  if (!/^[1-9]\d*$/.test(id)) return NextResponse.json({ error: "Réservation invalide." }, { status: 400 });
  try {
    const result = await markManualPermisPaid(getPermisServerClient(), id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof PermisPaymentError ? error.message : "Impossible de finaliser le paiement manuel.",
    }, { status: error instanceof PermisPaymentError ? error.status : 500 });
  }
}
