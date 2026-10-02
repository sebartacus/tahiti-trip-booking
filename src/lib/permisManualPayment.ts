import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPermisInvoicePdf, type PermisInvoiceReservation } from "./permisInvoice";
import { isManualPayzenPermis, type ManualPermisPaymentState } from "./permisAdmin";

type Reservation = PermisInvoiceReservation & ManualPermisPaymentState & {
  paid_at: string | null; statut: string | null;
  facture_numero: string | null; facture_url: string | null;
};
export class PermisPaymentError extends Error {
  constructor(message: string, public readonly status = 409) { super(message); }
}
async function load(db: SupabaseClient, id: string) {
  const result = await db.from("reservations").select("*").eq("id", id).maybeSingle();
  if (result.error) throw new PermisPaymentError("Impossible de lire la réservation.", 500);
  if (!result.data) throw new PermisPaymentError("Réservation Permis introuvable.", 404);
  return result.data as Reservation;
}
function completed(row: Reservation) {
  if (!row.facture_numero || !row.facture_url) {
    throw new PermisPaymentError("Ce dossier est déjà payé, mais sa facture doit être vérifiée.");
  }
  return { reservation: row, alreadyPaid: true };
}

export async function markManualPermisPaid(db: SupabaseClient, id: string, now = new Date()) {
  let row = await load(db, id);
  if (!isManualPayzenPermis(row)) throw new PermisPaymentError("Ce dossier ne relève pas du paiement manuel Permis.");
  if (row.paiement_effectue === true) return completed(row);
  if (row.paiement_effectue !== false || row.archived) throw new PermisPaymentError("Ce dossier ne peut pas être marqué comme payé.");
  if (!Number.isSafeInteger(row.pricing_amount) || Number(row.pricing_amount) <= 0 ||
      (row.formule !== "Classique" && row.formule !== "Sérénité") ||
      (row.formule === "Sérénité" && Number(row.pricing_amount) < 8000)) {
    throw new PermisPaymentError("Le montant enregistré ou la formule doit être vérifié.");
  }
  if (row.facture_numero || row.facture_url) {
    throw new PermisPaymentError("Une facture existe déjà sur ce dossier non payé. Vérifiez-la avant de continuer.");
  }

  // Persist the first confirmation instant with a conditional update. Concurrent
  // requests and retries then share the SAME invoice year/number/date, even at New Year.
  // If Storage fails, paid_at remains the confirmed payment time; paiement_effectue
  // stays false until the invoice is available. Retrying resumes the same invoice.
  if (!row.paid_at) {
    const claim = await db.from("reservations").update({ paid_at: now.toISOString() })
      .eq("id", id).eq("paiement_effectue", false).is("paid_at", null)
      .eq("origine_reservation", "salon_admin").eq("mode_paiement", "payzen")
      .eq("pricing_amount", row.pricing_amount!).eq("formule", row.formule!)
      .is("facture_numero", null).is("facture_url", null).select("*").maybeSingle();
    if (claim.error) throw new PermisPaymentError("Impossible d'enregistrer la confirmation du paiement.", 500);
    row = claim.data ? claim.data as Reservation : await load(db, id);
    if (!isManualPayzenPermis(row) || row.archived) throw new PermisPaymentError("Le dossier a changé. Rechargez la liste.");
    if (row.paiement_effectue === true) return completed(row);
  }
  if (row.paiement_effectue !== false || !row.paid_at || !Number.isFinite(Date.parse(row.paid_at))) {
    throw new PermisPaymentError("La confirmation du paiement a changé. Réessayez.");
  }

  const invoice = buildPermisInvoicePdf(row, new Date(row.paid_at));
  const path = `factures/permis/${invoice.invoiceNumber}.pdf`;
  const storage = db.storage.from("documents-permis");
  const upload = await storage.upload(path, invoice.pdf, { contentType: "application/pdf", upsert: false });
  if (upload.error) {
    // A parallel request (or interrupted previous attempt) may already have stored
    // this exact PDF. Never overwrite any document, and reject unrelated old PDFs.
    const existing = await storage.download(path);
    if (existing.error || !existing.data) {
      throw new PermisPaymentError("Facture non finalisée. Réessayez « Marquer comme payé ».", 503);
    }
    if (!Buffer.from(await existing.data.arrayBuffer()).equals(invoice.pdf)) {
      throw new PermisPaymentError("Un PDF différent existe déjà pour ce numéro. Il a été conservé.");
    }
  }

  const update = await db.from("reservations").update({
    paiement_effectue: true, statut: "Validé", mode_paiement: "payzen",
    facture_numero: invoice.invoiceNumber, facture_url: path,
  }).eq("id", id).eq("paiement_effectue", false).eq("paid_at", row.paid_at)
    .eq("origine_reservation", "salon_admin").eq("mode_paiement", "payzen")
    .eq("pricing_type", row.pricing_type!).eq("pricing_amount", row.pricing_amount!)
    .eq("formule", row.formule!).is("facture_numero", null).is("facture_url", null)
    .select("*").maybeSingle();
  if (update.error) throw new PermisPaymentError("Facture créée ; confirmation à finaliser. Réessayez « Marquer comme payé ».", 503);
  if (!update.data) {
    const current = await load(db, id);
    if (current.paiement_effectue === true && current.facture_numero === invoice.invoiceNumber && current.facture_url === path) {
      return completed(current);
    }
    throw new PermisPaymentError("Le dossier a changé. Rechargez la liste.");
  }
  return { reservation: update.data as Reservation, alreadyPaid: false };
}
