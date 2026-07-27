import { NextResponse } from "next/server";
import {
  buildBaleinesInvoicePdf,
  type BaleinesInvoiceReservation,
} from "@/lib/baleinesInvoice";
import {
  sendBaleinesReservationEmails,
  type BaleinesEmailReservation,
} from "@/lib/baleinesEmail";
import { supabase } from "@/lib/supabase";

type CarnetReservation = BaleinesEmailReservation &
  BaleinesInvoiceReservation & {
    email_sent: boolean | null;
    statut_paiement: string | null;
    paye: boolean | null;
    source_paiement: string | null;
  };

export async function POST(request: Request) {
  const body = await request.json();
  const reservationId =
    typeof body.reservationId === "string" ? body.reservationId.trim() : "";

  if (!reservationId) {
    return NextResponse.json(
      { error: "reservationId requis." },
      { status: 400 }
    );
  }

  const reservationResponse = await supabase
    .from("reservations_baleines")
    .select(
      "id,date_sortie,depart,responsable_prenom,responsable_nom,responsable_email,responsable_telephone,participants,montant_total,email_sent,statut_paiement,paye,source_paiement"
    )
    .eq("id", reservationId)
    .maybeSingle();

  if (reservationResponse.error || !reservationResponse.data) {
    return NextResponse.json(
      { error: "Réservation Baleines introuvable." },
      { status: 404 }
    );
  }

  const reservation = reservationResponse.data as CarnetReservation;
  const statutPaiement = String(
    reservation.statut_paiement || ""
  ).toLowerCase();
  const isPaid =
    reservation.paye === true ||
    statutPaiement === "paid" ||
    statutPaiement === "paye";

  if (reservation.source_paiement !== "carnet_baleines" || !isPaid) {
    return NextResponse.json(
      { error: "La réservation Carnet n'est pas confirmée." },
      { status: 409 }
    );
  }

  if (reservation.email_sent) {
    return NextResponse.json({ ok: true, email: "already_sent" });
  }

  const { invoiceNumber, pdf } = buildBaleinesInvoicePdf(reservation);
  const invoicePath = `factures/baleines/${invoiceNumber}.pdf`;
  const upload = await supabase.storage
    .from("documents-permis")
    .upload(invoicePath, pdf, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (upload.error) {
    return NextResponse.json(
      { error: "Erreur génération facture Baleines." },
      { status: 500 }
    );
  }

  const invoiceUpdate = await supabase
    .from("reservations_baleines")
    .update({
      facture_numero: invoiceNumber,
      facture_url: invoicePath,
    })
    .eq("id", reservationId);

  if (invoiceUpdate.error) {
    return NextResponse.json(
      { error: "Erreur enregistrement facture Baleines." },
      { status: 500 }
    );
  }

  const emailResult = await sendBaleinesReservationEmails({
    reservation,
    invoicePdf: pdf,
    invoiceNumber,
  });

  if (!("ok" in emailResult) || !emailResult.ok) {
    return NextResponse.json(
      {
        error:
          ("error" in emailResult && emailResult.error) ||
          ("reason" in emailResult && emailResult.reason) ||
          "Erreur envoi e-mails Baleines.",
      },
      { status: 500 }
    );
  }

  const emailUpdate = await supabase
    .from("reservations_baleines")
    .update({
      email_sent: true,
      email_sent_at: new Date().toISOString(),
    })
    .eq("id", reservationId);

  if (emailUpdate.error) {
    return NextResponse.json(
      { error: "E-mails envoyés, mais statut non enregistré." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, email: "sent" });
}
