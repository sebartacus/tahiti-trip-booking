import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ALLOWED_TABLES = new Set([
  "reservations_baleines",
  "reservations_peche",
  "reservations_peche_nuit",
]);

type ReservationRecord = {
  date_sortie?: unknown;
  formule?: unknown;
  slots?: unknown;
  nombre_personnes?: unknown;
  responsable_prenom?: unknown;
  responsable_nom?: unknown;
  responsable_email?: unknown;
  responsable_telephone?: unknown;
  prenom?: unknown;
  nom?: unknown;
  email?: unknown;
  telephone?: unknown;
  montant_total?: unknown;
  montant_paye?: unknown;
  type_paiement?: unknown;
  statut_paiement?: unknown;
  paye?: unknown;
  paiement_effectue?: unknown;
  participants?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeReservation(record: ReservationRecord) {
  const prenom = text(record.responsable_prenom) || text(record.prenom);
  const nom = text(record.responsable_nom) || text(record.nom);
  const email = text(record.responsable_email) || text(record.email);
  const telephone =
    text(record.responsable_telephone) || text(record.telephone);
  const statutPaiement = text(record.statut_paiement);
  const paid =
    record.paye === true ||
    record.paiement_effectue === true ||
    statutPaiement === "paid" ||
    statutPaiement === "paye";
  const capacities = countBaleinesParticipants(record.participants);
  const slots = Array.isArray(record.slots)
    ? record.slots.filter((slot): slot is string => typeof slot === "string")
    : [];

  return {
    date: text(record.date_sortie),
    formula: text(record.formule),
    peopleCount:
      typeof record.nombre_personnes === "number"
        ? String(record.nombre_personnes)
        : "",
    clientName: `${prenom} ${nom}`.trim() || "Non disponible",
    email: email || "Non disponible",
    telephone: telephone || "Non disponible",
    totalAmount:
      typeof record.montant_total === "number" ? record.montant_total : null,
    paidAmount:
      typeof record.montant_paye === "number" ? record.montant_paye : null,
    paymentType: text(record.type_paiement),
    payment: paid ? "Paye" : "En attente",
    statutPaiement: statutPaiement || "",
    slots,
    capacities,
  };
}

function countBaleinesParticipants(participants: unknown) {
  const capacities = { miseEau: 0, observateurs: 0 };

  if (!Array.isArray(participants)) return capacities;

  for (const participant of participants) {
    if (
      typeof participant === "object" &&
      participant !== null &&
      "role" in participant
    ) {
      if (participant.role === "mise_eau") capacities.miseEau++;
      if (participant.role === "observateur") capacities.observateurs++;
    }
  }

  return capacities;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const table = searchParams.get("table") || "";
  const id = searchParams.get("id") || "";

  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json(
      { error: "Table reservation non autorisee." },
      { status: 400 }
    );
  }

  if (!id) {
    return NextResponse.json(
      { error: "reservationId requis." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Impossible de charger la reservation." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Reservation introuvable." },
      { status: 404 }
    );
  }

  return NextResponse.json({ reservation: normalizeReservation(data) });
}
