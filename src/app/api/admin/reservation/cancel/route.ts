import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ALLOWED_TABLES = new Set(["reservations_peche", "reservations_baleines"]);

type CancelBody = {
  reservationTable?: unknown;
  reservationId?: unknown;
};

type ReservationRecord = {
  id: string;
  statut_paiement: string | null;
  paye: boolean | null;
  type_paiement?: string | null;
  source_paiement?: string | null;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isPaidReservation(record: ReservationRecord) {
  return (
    record.paye === true ||
    record.statut_paiement === "paid" ||
    record.statut_paiement === "paye"
  );
}

function isManualReservation(table: string, record: ReservationRecord) {
  if (table === "reservations_peche") {
    return (
      record.type_paiement === "external_invoice" ||
      record.statut_paiement === "paiement_externe_a_facturer"
    );
  }

  return record.source_paiement === "paiement_externe_a_facturer";
}

function shouldKeepHistory(table: string, record: ReservationRecord) {
  return !isManualReservation(table, record) && isPaidReservation(record);
}

function validateAdminPassword(request: Request) {
  const configuredPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "";
  if (!configuredPassword) return true;

  return request.headers.get("x-admin-password") === configuredPassword;
}

async function findReservation(table: string, reservationId: string) {
  if (table === "reservations_peche") {
    return supabase
      .from("reservations_peche")
      .select("id,statut_paiement,paye,type_paiement")
      .eq("id", reservationId)
      .maybeSingle();
  }

  return supabase
    .from("reservations_baleines")
    .select("id,statut_paiement,paye,source_paiement")
    .eq("id", reservationId)
    .maybeSingle();
}

async function cancelReservation(table: string, reservationId: string) {
  return supabase
    .from(table)
    .update({
      statut_paiement: "cancelled",
      paye: false,
    })
    .eq("id", reservationId)
    .select("id")
    .single();
}

async function deleteReservation(table: string, reservationId: string) {
  return supabase.from(table).delete().eq("id", reservationId).select("id");
}

async function releaseBoatSlots(table: string, reservationId: string) {
  return supabase
    .from("boat_calendar_slots")
    .update({
      status: "available",
      activity: null,
      reservation_id: null,
      reservation_table: null,
      blocked_reason: null,
      blocked_by: null,
      blocked_at: null,
      expires_at: null,
    })
    .eq("reservation_table", table)
    .eq("reservation_id", reservationId)
    .select(
      "id,date,slot,status,activity,reservation_id,reservation_table,expires_at"
    );
}

export async function POST(request: Request) {
  if (!validateAdminPassword(request)) {
    return NextResponse.json({ error: "Acces admin refuse." }, { status: 401 });
  }

  let body: CancelBody;

  try {
    body = (await request.json()) as CancelBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const reservationTable = text(body.reservationTable);
  const reservationId = text(body.reservationId);

  console.log("[admin-cancel] received", {
    reservationTable,
    reservationId,
  });

  if (!ALLOWED_TABLES.has(reservationTable) || !reservationId) {
    console.error("[admin-cancel] invalid payload", {
      reservationTable,
      reservationId,
    });

    return NextResponse.json(
      { error: "Reservation invalide." },
      { status: 400 }
    );
  }

  const reservation = await findReservation(reservationTable, reservationId);

  console.log("[admin-cancel] findReservation result", {
    reservationTable,
    reservationId,
    data: reservation.data,
    error: reservation.error,
  });

  if (reservation.error) {
    return NextResponse.json(
      {
        error: "Impossible de charger la reservation.",
        supabaseError: reservation.error,
      },
      { status: 500 }
    );
  }

  if (!reservation.data) {
    return NextResponse.json(
      { error: "Reservation introuvable." },
      { status: 404 }
    );
  }

  const manualReservation = isManualReservation(reservationTable, reservation.data);
  const paidReservation = isPaidReservation(reservation.data);
  const externalInvoice =
    reservation.data.type_paiement === "external_invoice" ||
    reservation.data.statut_paiement === "paiement_externe_a_facturer" ||
    reservation.data.source_paiement === "paiement_externe_a_facturer";

  console.log("[admin-cancel] detected type", {
    reservationTable,
    reservationId,
    manual: manualReservation,
    external_invoice: externalInvoice,
    payzen_paid: paidReservation,
    reservation: reservation.data,
  });

  if (
    reservation.data.statut_paiement === "cancelled" &&
    !manualReservation
  ) {
    return NextResponse.json(
      { error: "Cette reservation est deja annulee." },
      { status: 409 }
    );
  }

  let action: "cancelled" | "deleted";

  if (shouldKeepHistory(reservationTable, reservation.data)) {
    console.log("[admin-cancel] action chosen", {
      action: "update cancelled",
      reservationTable,
      reservationId,
    });

    const cancellation = await cancelReservation(reservationTable, reservationId);

    console.log("[admin-cancel] update result", {
      reservationTable,
      reservationId,
      data: cancellation.data,
      error: cancellation.error,
    });

    if (cancellation.error) {
      return NextResponse.json(
        {
          error: "Impossible d'annuler la reservation.",
          supabaseError: cancellation.error,
        },
        { status: 500 }
      );
    }

    action = "cancelled";
  } else {
    console.log("[admin-cancel] action chosen", {
      action: "delete",
      reservationTable,
      reservationId,
    });

    const deletion = await deleteReservation(reservationTable, reservationId);

    console.log("[admin-cancel] delete result", {
      reservationTable,
      reservationId,
      data: deletion.data,
      error: deletion.error,
    });

    if (deletion.error || !deletion.data || deletion.data.length === 0) {
      return NextResponse.json(
        {
          error: deletion.error
            ? `Impossible de supprimer la reservation: ${deletion.error.message}`
            : "Impossible de supprimer la reservation: aucune ligne supprimee.",
          supabaseError: deletion.error,
          supabaseData: deletion.data,
        },
        { status: 500 }
      );
    }

    action = "deleted";
  }

  const releasedSlots = await releaseBoatSlots(reservationTable, reservationId);

  console.log("[admin-cancel] release slots result", {
    reservationTable,
    reservationId,
    data: releasedSlots.data,
    error: releasedSlots.error,
  });

  if (releasedSlots.error) {
    return NextResponse.json(
      {
        error:
          "Reservation annulee, mais le calendrier bateau n'a pas pu etre libere.",
        supabaseError: releasedSlots.error,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    action,
    reservationId,
    reservationTable,
    reservationType: manualReservation ? "manual" : "payzen",
    releasedSlots: releasedSlots.data || [],
  });
}
