import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  buildPermisInvoicePdf,
  type PermisInvoiceReservation,
} from "@/lib/permisInvoice";
import { sendPermisReservationEmails } from "@/lib/permisEmail";
import {
  sendPecheReservationEmails,
  type PecheEmailReservation,
} from "@/lib/pecheEmail";
import {
  sendBaleinesReservationEmails,
  type BaleinesEmailReservation,
} from "@/lib/baleinesEmail";

const ACCEPTED_STATUSES = new Set(["AUTHORISED"]);

async function confirmBoatReservation(
  request: Request,
  reservationId: string,
  reservationTable: string,
  activity: string
) {
  const response = await fetch(new URL("/api/bateau/confirm", request.url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reservationId, reservationTable, activity }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    return payload.error || "Erreur confirmation calendrier bateau";
  }

  return "";
}

async function generatePermisInvoice(reservation: PermisInvoiceReservation) {
  const { invoiceNumber, pdf } = buildPermisInvoicePdf(reservation);
  const invoicePath = `factures/permis/${invoiceNumber}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("documents-permis")
    .upload(invoicePath, pdf, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error: updateError } = await supabase
    .from("reservations")
    .update({
      facture_numero: invoiceNumber,
      facture_url: invoicePath,
    })
    .eq("id", reservation.id);

  if (updateError) {
    return { error: updateError.message };
  }

  return { invoiceNumber, invoicePath, pdf };
}

function getBaseUrl(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost || request.headers.get("host");

  if (host) {
    return `${forwardedProto || requestUrl.protocol.replace(":", "")}://${host}`;
  }

  return requestUrl.origin;
}

function emailResultLabel(
  result: {
    ok?: boolean;
    error?: string;
    skipped?: boolean;
    reason?: string;
  }
) {
  if ("ok" in result && result.ok) return "sent";
  if (result.error) return result.error;
  return result.reason || "skipped";
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const statutPaiement = String(formData.get("vads_trans_status") || "");
  const email = String(formData.get("vads_cust_email") || "");
  const transactionId = String(formData.get("vads_trans_id") || "");
  const reservationId = String(formData.get("vads_order_id") || "");
  const reservationTable = String(
    formData.get("vads_ext_info_reservation_table") || ""
  );

  console.log("Notification PayZen recue", {
    statutPaiement,
    email,
    transactionId,
    reservationId,
    reservationTable,
  });

  if (!ACCEPTED_STATUSES.has(statutPaiement)) {
    return NextResponse.json({
      ok: true,
      message: "Paiement non autorise",
    });
  }

  if (reservationTable === "reservations_baleines") {
    if (!reservationId) {
      return NextResponse.json(
        { error: "reservationId Baleines manquant" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("reservations_baleines")
      .update({
        statut_paiement: "paid",
        paye: true,
      })
      .eq("id", reservationId);

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Erreur mise a jour reservation Baleines" },
        { status: 500 }
      );
    }

    const confirmError = await confirmBoatReservation(
      request,
      reservationId,
      "reservations_baleines",
      "baleines"
    );

    if (confirmError) {
      console.error(confirmError);
      return NextResponse.json({ error: confirmError }, { status: 500 });
    }

    const reservationResponse = await supabase
      .from("reservations_baleines")
      .select(
        "id,date_sortie,depart,responsable_prenom,responsable_nom,responsable_email,responsable_telephone,participants,montant_total,email_sent"
      )
      .eq("id", reservationId)
      .single();

    let emailStatus = "not_sent";

    if (reservationResponse.error || !reservationResponse.data) {
      console.error(reservationResponse.error);
    } else {
      const reservation = reservationResponse.data as BaleinesEmailReservation & {
        email_sent: boolean | null;
      };

      if (reservation.email_sent) {
        emailStatus = "already_sent";
      } else {
        const emailResult = await sendBaleinesReservationEmails({
          reservation,
        });

        emailStatus = emailResultLabel(emailResult);

        if ("error" in emailResult && emailResult.error) {
          console.error(emailResult.error);
        } else if ("ok" in emailResult && emailResult.ok) {
          const emailUpdate = await supabase
            .from("reservations_baleines")
            .update({
              email_sent: true,
              email_sent_at: new Date().toISOString(),
            })
            .eq("id", reservationId);

          if (emailUpdate.error) {
            console.error(emailUpdate.error);
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Paiement Baleines valide",
      email: emailStatus,
    });
  }

  if (reservationTable === "reservations_peche") {
    if (!reservationId) {
      return NextResponse.json(
        { error: "reservationId Peche manquant" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("reservations_peche")
      .update({
        statut_paiement: "paid",
        paye: true,
      })
      .eq("id", reservationId);

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Erreur mise a jour reservation Peche" },
        { status: 500 }
      );
    }

    const confirmError = await confirmBoatReservation(
      request,
      reservationId,
      "reservations_peche",
      "peche"
    );

    if (confirmError) {
      console.error(confirmError);
      return NextResponse.json({ error: confirmError }, { status: 500 });
    }

    const reservationResponse = await supabase
      .from("reservations_peche")
      .select(
        "id,date_sortie,formule,slots,nombre_personnes,responsable_prenom,responsable_nom,responsable_email,responsable_telephone,montant_paye,email_sent"
      )
      .eq("id", reservationId)
      .single();

    let emailStatus = "not_sent";

    if (reservationResponse.error || !reservationResponse.data) {
      console.error(reservationResponse.error);
    } else {
      const reservation = reservationResponse.data as PecheEmailReservation & {
        email_sent: boolean | null;
      };

      if (reservation.email_sent) {
        emailStatus = "already_sent";
      } else {
        const emailResult = await sendPecheReservationEmails({
          reservation,
        });

        emailStatus = emailResultLabel(emailResult);

        if ("error" in emailResult && emailResult.error) {
          console.error(emailResult.error);
        } else if ("ok" in emailResult && emailResult.ok) {
          const emailUpdate = await supabase
            .from("reservations_peche")
            .update({
              email_sent: true,
              email_sent_at: new Date().toISOString(),
            })
            .eq("id", reservationId);

          if (emailUpdate.error) {
            console.error(emailUpdate.error);
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Paiement Peche valide",
      email: emailStatus,
    });
  }

  if (!email) {
    return NextResponse.json({ error: "Email manquant" }, { status: 400 });
  }

  if (reservationTable === "reservations" && reservationId) {
    const reservationResponse = await supabase
      .from("reservations")
      .select(
        "id,prenom,nom,telephone,email,formule,examen,date_cours,pricing_type,pricing_amount,facture_numero,facture_url,email_sent"
      )
      .eq("id", reservationId)
      .single();

    if (reservationResponse.error || !reservationResponse.data) {
      console.error(reservationResponse.error);
      return NextResponse.json(
        { error: "Reservation Permis introuvable" },
        { status: 404 }
      );
    }

    const reservation = reservationResponse.data as PermisInvoiceReservation & {
      facture_numero: string | null;
      facture_url: string | null;
      email_sent: boolean | null;
      examen: string | null;
      date_cours: string | null;
    };

    if (reservation.email_sent) {
      const { error } = await supabase
        .from("reservations")
        .update({
          paiement_effectue: true,
        })
        .eq("id", reservationId);

      if (error) {
        console.error(error);
        return NextResponse.json(
          { error: "Erreur mise a jour reservation" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: "Paiement Permis deja notifie",
        facture: reservation.facture_numero,
      });
    }

    const invoiceResult = await generatePermisInvoice(reservation);

    if (invoiceResult.error) {
      console.error(invoiceResult.error);
      return NextResponse.json(
        { error: "Erreur generation facture Permis" },
        { status: 500 }
      );
    }

    if (!invoiceResult.invoiceNumber || !invoiceResult.invoicePath || !invoiceResult.pdf) {
      return NextResponse.json(
        { error: "Facture Permis incomplete" },
        { status: 500 }
      );
    }

    const paidUpdate = await supabase
      .from("reservations")
      .update({
        paiement_effectue: true,
      })
      .eq("id", reservationId);

    if (paidUpdate.error) {
      console.error(paidUpdate.error);
      return NextResponse.json(
        { error: "Erreur mise a jour reservation" },
        { status: 500 }
      );
    }

    const emailResult = await sendPermisReservationEmails({
      reservation: {
        ...reservation,
        facture_numero: invoiceResult.invoiceNumber || null,
        facture_url: invoiceResult.invoicePath || null,
      },
      invoicePdf: invoiceResult.pdf,
      invoiceNumber: invoiceResult.invoiceNumber,
      baseUrl: getBaseUrl(request),
    });

    if ("error" in emailResult && emailResult.error) {
      console.error(emailResult.error);
    } else if ("ok" in emailResult && emailResult.ok) {
      const emailUpdate = await supabase
        .from("reservations")
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
        })
        .eq("id", reservationId);

      if (emailUpdate.error) {
        console.error(emailUpdate.error);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Paiement Permis valide",
      facture: invoiceResult.invoiceNumber,
      email:
        "ok" in emailResult && emailResult.ok
          ? "sent"
          : "error" in emailResult && emailResult.error
          ? "error"
          : "reason" in emailResult
          ? emailResult.reason
          : "skipped",
    });
  }

  const { error } = await supabase
    .from("reservations")
    .update({
      paiement_effectue: true,
    })
    .eq("email", email);

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erreur mise a jour reservation" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Paiement valide",
  });
}
