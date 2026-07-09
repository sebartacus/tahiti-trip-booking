import { NextResponse } from "next/server";
import { PECHE_FORMULAS, type FormulaId } from "@/components/peche/constants";
import { supabase } from "@/lib/supabase";

type ManualPecheReservationBody = {
  date?: unknown;
  formulaId?: unknown;
  origin?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  phone?: unknown;
  email?: unknown;
  peopleCount?: unknown;
  comment?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function findFormula(value: unknown) {
  if (typeof value !== "string") return null;
  return PECHE_FORMULAS.find((formula) => formula.id === value) || null;
}

async function deleteReservation(reservationId: string) {
  return supabase.from("reservations_peche").delete().eq("id", reservationId);
}

async function releaseReservationSlots(reservationId: string) {
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
    .eq("reservation_id", reservationId)
    .eq("reservation_table", "reservations_peche");
}

function reservationInsertErrorMessage(error: { code?: string; message?: string }) {
  if (
    error.code === "PGRST204" ||
    error.message?.includes("reservations_peche_type_paiement_check") ||
    error.message?.includes("reservations_peche_statut_paiement_check") ||
    error.message?.includes("commentaire") ||
    error.message?.includes("origine")
  ) {
    return "Migration Supabase reservations_peche manquante pour les reservations Peche manuelles.";
  }

  return error.message || "Impossible de creer la reservation Peche.";
}

function parseApiError(responseText: string) {
  try {
    return responseText ? (JSON.parse(responseText) as { error?: string }) : {};
  } catch {
    return { error: responseText };
  }
}

export async function POST(request: Request) {
  let body: ManualPecheReservationBody;

  try {
    body = (await request.json()) as ManualPecheReservationBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const date = text(body.date);
  const formula = findFormula(body.formulaId);
  const origin = text(body.origin);
  const firstName = text(body.firstName);
  const lastName = text(body.lastName);
  const phone = text(body.phone);
  const email = text(body.email);
  const peopleCount = Number(body.peopleCount);
  const comment = text(body.comment);

  if (!isIsoDate(date)) {
    return NextResponse.json(
      { error: "Date de sortie invalide." },
      { status: 400 }
    );
  }

  if (!formula) {
    return NextResponse.json({ error: "Formule invalide." }, { status: 400 });
  }

  if (!origin || !firstName || !lastName || !phone) {
    return NextResponse.json(
      { error: "Informations de reservation incompletes." },
      { status: 400 }
    );
  }

  if (!Number.isInteger(peopleCount) || peopleCount < 1 || peopleCount > 4) {
    return NextResponse.json(
      { error: "Indiquez entre 1 et 4 participants." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("reservations_peche")
    .insert({
      date_sortie: date,
      formule: formula.id satisfies FormulaId,
      slots: formula.slots,
      origine: origin,
      commentaire: comment || null,
      nombre_personnes: peopleCount,
      responsable_prenom: firstName,
      responsable_nom: lastName,
      responsable_email: email || null,
      responsable_telephone: phone,
      montant_total: 0,
      montant_paye: 0,
      type_paiement: "external_invoice",
      statut_paiement: "paiement_externe_a_facturer",
      paye: false,
      email_sent: false,
      facture_numero: null,
      facture_url: null,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return NextResponse.json(
      {
        error: error
          ? reservationInsertErrorMessage(error)
          : "Impossible de creer la reservation Peche.",
        code: error?.code,
        details: error?.details,
      },
      { status: 500 }
    );
  }

  const holdResponse = await fetch(new URL("/api/bateau/hold", request.url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      activity: "peche",
      reservationTable: "reservations_peche",
      reservationId: data.id,
      date,
      slots: formula.slots,
    }),
  });

  if (!holdResponse.ok) {
    const payload = parseApiError(await holdResponse.text());
    await deleteReservation(data.id);

    return NextResponse.json(
      {
        error:
          holdResponse.status === 409
            ? "Ce creneau bateau n'est pas disponible."
            : payload.error || "Impossible de bloquer le calendrier bateau.",
      },
      { status: holdResponse.status === 409 ? 409 : 500 }
    );
  }

  const confirmResponse = await fetch(
    new URL("/api/bateau/confirm", request.url),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activity: "peche",
        reservationTable: "reservations_peche",
        reservationId: data.id,
        date,
        slots: formula.slots,
      }),
    }
  );

  if (!confirmResponse.ok) {
    const payload = parseApiError(await confirmResponse.text());
    await releaseReservationSlots(data.id);
    await deleteReservation(data.id);

    return NextResponse.json(
      {
        error:
          payload.error || "Reservation creee, mais le bateau n'a pas pu etre confirme.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ reservationId: data.id }, { status: 201 });
}
