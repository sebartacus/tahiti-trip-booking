import type { SupabaseClient } from "@supabase/supabase-js";
import { buildBaleinesInvoicePdf, type BaleinesInvoiceReservation } from "@/lib/baleinesInvoice";
import { sendBaleinesReservationEmails } from "@/lib/baleinesEmail";

type InvoiceJob = {
  token: string; invoice_number: string; invoice_path: string;
  reservation_snapshot: BaleinesInvoiceReservation; customer_sent_at: string | null; created_at: string;
};
export class BaleinesDeliveryError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}

export async function deliverBaleinesInvoice(client: SupabaseClient, reservationId: string) {
  const claim = await client.rpc("claim_baleines_invoice", { p_reservation_id: reservationId });
  if (claim.error) throw new BaleinesDeliveryError(claim.error.message, claim.error.code === "PBI04" ? 404 : 409);
  if (claim.data?.already_sent) return { alreadySent: true };
  const job = claim.data as InvoiceJob;
  if (!job?.token) throw new BaleinesDeliveryError("Impossible de verrouiller la facture.");
  const finish = async (action: string, error?: string) => {
    const result = await client.rpc("finish_baleines_invoice", {
      p_reservation_id: reservationId, p_token: job.token, p_action: action, p_error: error ?? null,
    });
    if (result.error) throw new BaleinesDeliveryError(result.error.message);
  };
  try {
    const bucket = client.storage.from("documents-permis");
    // Resume the same PDF after a partial failure; never overwrite it.
    const existing = await bucket.download(job.invoice_path);
    let pdf: Buffer;
    if (existing.data && !existing.error) {
      pdf = Buffer.from(await existing.data.arrayBuffer());
    } else {
      const storageStatus = String(existing.error?.statusCode ?? "");
      if (!["404", "400"].includes(storageStatus) ||
          !/not found|not_found|NoSuchKey|does not exist/i.test(existing.error?.message ?? "")) {
        throw new BaleinesDeliveryError(existing.error?.message || "Impossible de lire la facture.");
      }
      pdf = buildBaleinesInvoicePdf(job.reservation_snapshot, new Date(job.created_at), {
        invoiceNumber: job.invoice_number,
      }).pdf;
      const uploaded = await bucket.upload(job.invoice_path, pdf, { contentType: "application/pdf", upsert: false });
      if (uploaded.error) throw new BaleinesDeliveryError(uploaded.error.message);
    }
    if (pdf.subarray(0, 5).toString() !== "%PDF-") throw new BaleinesDeliveryError("La facture stockée n’est pas un PDF valide.");
    await finish("invoice");
    let customerSent = Boolean(job.customer_sent_at);
    const email = await sendBaleinesReservationEmails({
      reservation: job.reservation_snapshot, invoicePdf: pdf, invoiceNumber: job.invoice_number,
      idempotencyKey: "baleines-invoice-" + reservationId,
      customerAlreadySent: Boolean(job.customer_sent_at),
      beforeCustomerSend: () => finish("customer_attempt"),
      onCustomerSent: async () => {
        await finish("customer");
        customerSent = true;
      },
    }).catch(error => {
      if (!customerSent) throw error;
      console.error("Email interne Baleines non envoy?", error);
      return { ok: true };
    });
    if (!customerSent && (!("ok" in email) || !email.ok)) {
      throw new BaleinesDeliveryError(("error" in email ? email.error : "reason" in email ? email.reason : undefined) || "Email non envoyé.");
    }
    if (customerSent && !("ok" in email)) console.error("Email interne Baleines non envoy?", email);
    await finish("sent");
    return { alreadySent: false, invoiceNumber: job.invoice_number };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur facture Baleines.";
    // If release fails, keep the durable processing lock to prevent duplicates.
    try { await finish("failed", message); } catch { /* Requires operator inspection. */ }
    throw error;
  }
}
