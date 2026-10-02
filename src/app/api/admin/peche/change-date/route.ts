import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getSalonAdminClient } from "@/lib/salonAdmin";
import { movePecheWithInvoice, PecheMoveError } from "@/lib/pecheDateChange";

export const runtime = "nodejs";
export const maxDuration = 60;

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + "T00:00:00Z")) && new Date(value + "T00:00:00Z").toISOString().slice(0,10) === value;
}
function input(value: Record<string, unknown>) {
  if (typeof value.reservationId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.reservationId) ||
    !validDate(value.date) || !validDate(value.expectedDate)) return null;
  return { reservationId: value.reservationId, date: value.date, expectedDate: value.expectedDate };
}
function failure(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (error instanceof PecheMoveError) return NextResponse.json({ error: error.message, uncertain: error.uncertain }, { status: 503 });
  if (["P0001","P0002","22023","23505","55P03","40P01","40001"].includes(code || "")) {
    const message = code === "P0001" || code === "P0002" || code === "22023"
      ? (error as Error).message : "Le créneau vient de changer ou une opération est en cours. Réessayez.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
  return NextResponse.json({ error: "Déplacement non effectué. Vérifiez la migration et le stockage, puis réessayez." }, { status: 500 });
}

export async function GET(request: Request) {
  if (!verifyAdminSession(request)) return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  const parsed = input(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed) return NextResponse.json({ error: "Réservation ou date invalide." }, { status: 400 });
  try {
    const { data, error } = await getSalonAdminClient().rpc("check_peche_date_change", {
      p_reservation_id: parsed.reservationId, p_date: parsed.date, p_expected_date: parsed.expectedDate,
    });
    if (error) throw error;
    return NextResponse.json({ available: true, slots: data.reservation.slots }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const response = failure(error);
    const payload = await response.json();
    const labels: Record<string, string> = { morning: "matin", afternoon: "après-midi" };
    const rawMessage = typeof payload.error === "string" ? payload.error : "";
    const slot = /\((morning|afternoon)\)/.exec(rawMessage)?.[1];
    const message = response.status >= 500
      ? "Impossible de vérifier la disponibilité. Réessayez."
      : slot ? rawMessage.replace(`(${slot})`, `(${labels[slot]})`) : rawMessage;
    return NextResponse.json({ available: false, error: message, ...(slot ? { blockingSlot: slot } : {}) }, {
      status: response.status, headers: { "Cache-Control": "no-store" },
    });
  }
}

export async function POST(request: Request) {
  if (!verifyAdminSession(request)) return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON invalide." }, { status: 400 }); }
  const parsed = body && input(body);
  if (!parsed) return NextResponse.json({ error: "Réservation ou date invalide." }, { status: 400 });
  try {
    const client = getSalonAdminClient();
    const storage = client.storage.from("documents-permis");
    const result = await movePecheWithInvoice(client, {
      async assertExists(path) {
        const { error } = await storage.download(path);
        if (error) throw new Error("Ancien PDF introuvable.");
      },
      async upload(path, pdf) {
        const { error } = await storage.upload(path, pdf, { contentType: "application/pdf", upsert: false });
        if (error) throw new Error("Échec du stockage du nouveau PDF.");
      },
      async remove(path) {
        const { error } = await storage.remove([path]);
        if (error) throw new Error("Nettoyage du nouveau PDF impossible.");
      },
    }, parsed);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) { return failure(error); }
}
