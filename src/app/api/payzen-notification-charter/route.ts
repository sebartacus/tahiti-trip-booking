import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  getExpectedCharterPayment,
  getPayzenKey,
  getPayzenTransactionReference,
  PAYZEN_ACCEPTED_STATUS,
  verifyPayzenSignature,
} from "@/lib/charter-payment";
import { buildCharterInvoicePdf, type CharterInvoiceReservation } from "@/lib/charterInvoice";
import { sendCharterCustomerEmail, sendCharterInternalEmail } from "@/lib/charterEmail";

const FAILED_STATUSES = new Set(["ABANDONED", "CANCELLED", "REFUSED", "EXPIRED", "NOT_CREATED", "ERROR"]);
const SELECT_FIELDS = "id,date_debut,date_fin,formule,nombre_personnes,responsable_prenom,responsable_nom,responsable_email,responsable_tel,montant_total,montant_paye,montant_solde,type_paiement,statut_paiement,paye,sunset_drink,champagne_supplement,transaction_id,paid_at,facture_numero,facture_url,email_sent,customer_email_sent,internal_email_sent,delivery_status";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configuration Supabase Charter manquante.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function response(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const fields: Record<string, string> = {};
    formData.forEach((value, name) => { fields[name] = String(value); });

    const key = getPayzenKey(fields.vads_ctx_mode || "");
    if (!key || !verifyPayzenSignature(fields, String(formData.get("signature") || ""), key)) {
      return response("Signature PayZen invalide.", 400);
    }

    const reservationId = fields.vads_ext_info_reservation_id || fields.vads_order_id || "";
    if (
      fields.vads_ext_info_activity !== "charter" ||
      fields.vads_ext_info_reservation_table !== "reservations_charter" ||
      fields.vads_currency !== "953" ||
      !reservationId
    ) {
      return response("Contexte de paiement Charter invalide.", 409);
    }

    const supabase = adminClient();
    const reservationQuery = await supabase.from("reservations_charter").select(SELECT_FIELDS)
      .eq("id", reservationId).maybeSingle();
    if (reservationQuery.error || !reservationQuery.data) return response("Réservation Charter introuvable.", 404);
    const reservation = reservationQuery.data;

    let expected;
    try {
      expected = getExpectedCharterPayment(reservation);
    } catch (error) {
      return response(error instanceof Error ? error.message : "Réservation Charter incohérente.", 409);
    }
    const receivedAmount = Number(fields.vads_amount || 0);
    if (!Number.isInteger(receivedAmount) || receivedAmount !== expected.amountToPay) {
      return response("Montant PayZen incohérent.", 409);
    }

    const payzenStatus = fields.vads_trans_status || "";
    if (payzenStatus !== PAYZEN_ACCEPTED_STATUS) {
      if (FAILED_STATUSES.has(payzenStatus)) {
        const failure = await supabase.rpc("fail_charter_payment", {
          p_reservation_id: reservationId,
          p_error: `PayZen: ${payzenStatus}`,
        });
        if (failure.error) return response("Impossible d’enregistrer l’échec du paiement.", 500);
      }
      return NextResponse.json({ ok: true, message: FAILED_STATUSES.has(payzenStatus) ? "Paiement non autorisé, holds libérés." : "Paiement en attente." });
    }

    const transactionId = getPayzenTransactionReference(fields);
    if (!transactionId || transactionId === "-") return response("Référence PayZen manquante.", 409);
    const paidAt = new Date().toISOString();
    const confirmation = await supabase.rpc("confirm_charter_payment", {
      p_reservation_id: reservationId,
      p_transaction_id: transactionId,
      p_amount: receivedAmount,
      p_paid_at: paidAt,
    });
    if (confirmation.error) return response("Erreur lors de la confirmation atomique du Charter.", 500);
    const confirmationResult = Array.isArray(confirmation.data) ? confirmation.data[0] : confirmation.data;
    if (!confirmationResult?.success) {
      const code = String(confirmationResult?.error_code || "confirmation_failed");
      await supabase.from("reservations_charter").update({ payment_error: code }).eq("id", reservationId).eq("paye", false);
      if (code === "hold_expired_or_incomplete") {
        console.error(`Paiement Charter accepté mais holds expirés/incomplets : ${reservationId}`);
        return response("Paiement reçu mais disponibilités non confirmées. Intervention requise.", 409);
      }
      return response(`Confirmation Charter refusée (${code}).`, 409);
    }

    const refreshed = await supabase.from("reservations_charter").select(SELECT_FIELDS)
      .eq("id", reservationId).single();
    if (refreshed.error || !refreshed.data) return response("Réservation confirmée mais relecture impossible.", 500);
    if (refreshed.data.email_sent) {
      return NextResponse.json({ ok: true, message: "Paiement Charter déjà traité." });
    }

    const claim = await supabase.rpc("claim_charter_delivery", { p_reservation_id: reservationId });
    if (claim.error) return response("Impossible de verrouiller la livraison de confirmation.", 500);
    if (!claim.data) return NextResponse.json({ ok: true, message: "Confirmation Charter déjà en cours de traitement." });

    const record = refreshed.data as CharterInvoiceReservation & {
      customer_email_sent: boolean;
      internal_email_sent: boolean;
      facture_numero: string | null;
      paid_at: string | null;
    };
    const invoice = buildCharterInvoicePdf(record, record.paid_at ? new Date(record.paid_at) : new Date());
    const invoicePath = `factures/charter/${invoice.invoiceNumber}.pdf`;
    const upload = await supabase.storage.from("documents-permis").upload(invoicePath, invoice.pdf, {
      contentType: "application/pdf", upsert: true,
    });
    if (upload.error) {
      await supabase.from("reservations_charter").update({ delivery_status: "failed", payment_error: "invoice_upload_failed" }).eq("id", reservationId);
      return response("Paiement confirmé, mais facture non générée.", 500);
    }
    const invoiceUpdate = await supabase.from("reservations_charter").update({
      facture_numero: invoice.invoiceNumber, facture_url: invoicePath,
    }).eq("id", reservationId);
    if (invoiceUpdate.error) {
      await supabase.from("reservations_charter").update({ delivery_status: "failed", payment_error: "invoice_update_failed" }).eq("id", reservationId);
      return response("Paiement confirmé, mais facture non enregistrée.", 500);
    }

    if (!record.customer_email_sent) {
      const customer = await sendCharterCustomerEmail({ reservation: record, invoicePdf: invoice.pdf, invoiceNumber: invoice.invoiceNumber });
      if (!("ok" in customer)) {
        await supabase.from("reservations_charter").update({ delivery_status: "failed", payment_error: "customer_email_failed" }).eq("id", reservationId);
        return response("Paiement confirmé, mais e-mail client non envoyé.", 500);
      }
      await supabase.from("reservations_charter").update({ customer_email_sent: true }).eq("id", reservationId);
    }

    if (!record.internal_email_sent) {
      const internal = await sendCharterInternalEmail({ reservation: record, invoicePdf: invoice.pdf, invoiceNumber: invoice.invoiceNumber });
      if (!("ok" in internal)) {
        await supabase.from("reservations_charter").update({ delivery_status: "failed", payment_error: "internal_email_failed" }).eq("id", reservationId);
        return response("Paiement confirmé, mais e-mail interne non envoyé.", 500);
      }
      await supabase.from("reservations_charter").update({ internal_email_sent: true }).eq("id", reservationId);
    }

    const delivered = await supabase.from("reservations_charter").update({
      email_sent: true, email_sent_at: new Date().toISOString(), delivery_status: "sent", payment_error: null,
    }).eq("id", reservationId);
    if (delivered.error) return response("Paiement et e-mails confirmés, mais statut final non enregistré.", 500);

    return NextResponse.json({ ok: true, message: "Paiement, slots, facture et e-mails Charter confirmés." });
  } catch (error) {
    console.error("Erreur notification PayZen Charter :", error);
    return response("Erreur serveur Charter.", 500);
  }
}
