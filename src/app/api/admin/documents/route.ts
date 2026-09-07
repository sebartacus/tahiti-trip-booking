import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getPermisServerClient } from "@/lib/permisServer";

const fields = ["certificat_url", "formulaire_url", "photo_url", "identite_url", "facture_url"] as const;
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  if (!verifyAdminSession(request)) return NextResponse.json({ error: "Accès admin refusé." }, { status: 401, headers });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some(key => !["reservationId", "field"].includes(key)) ||
      !/^[1-9]\d*$/.test(String(body.reservationId)) ||
      !fields.includes(body.field as typeof fields[number])) throw new Error("Invalid document");
  } catch {
    return NextResponse.json({ error: "Document demandé invalide." }, { status: 400, headers });
  }
  try {
    const db = getPermisServerClient();
    const field = body.field as typeof fields[number];
    const result = await db.from("reservations").select("id," + field)
      .eq("id", String(body.reservationId)).maybeSingle();
    if (result.error) throw result.error;
    const row = result.data as Record<string, unknown> | null;
    const path = row?.[field];
    if (!row || typeof path !== "string" || !path.trim()) {
      return NextResponse.json({ error: "Document introuvable." }, { status: 404, headers });
    }
    // The path comes from the dossier, never from the request.
    if (path.startsWith("/") || path.includes("\\") || path.includes("://") || path.split("/").some(part => part === ".." || part === ".")) {
      return NextResponse.json({ error: "Chemin documentaire invalide." }, { status: 409, headers });
    }
    const signed = await db.storage.from("documents-permis").createSignedUrl(path, 600);
    if (signed.error || !signed.data?.signedUrl) throw new Error("Signature failed");
    return NextResponse.json({ signedUrl: signed.data.signedUrl }, { headers });
  } catch {
    return NextResponse.json({ error: "Impossible d’ouvrir le document." }, { status: 500, headers });
  }
}
