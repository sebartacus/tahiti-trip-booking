import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  PECHE_FORMULAS,
  type FormulaId,
  type PaymentType,
} from "@/components/peche/constants";

type ReservationBody = {
  date?: unknown;
  formulaId?: unknown;
  peopleCount?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  paymentType?: unknown;
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

function normalizePaymentType(value: unknown): PaymentType | null {
  if (value === "deposit" || value === "full") return value;
  return null;
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Configuration Supabase manquante: NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseAnonKey) {
    throw new Error(
      "Configuration Supabase manquante: NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Erreur inconnue.";
}

export async function POST(request: Request) {
  let body: ReservationBody;

  try {
    body = (await request.json()) as ReservationBody;
  } catch (error) {
    return NextResponse.json(
      { error: `JSON invalide: ${errorMessage(error)}` },
      { status: 400 }
    );
  }

  const date = text(body.date);
  const formula = findFormula(body.formulaId);
  const paymentType = normalizePaymentType(body.paymentType);
  const peopleCount = Number(body.peopleCount);
  const firstName = text(body.firstName);
  const lastName = text(body.lastName);
  const email = text(body.email);
  const phone = text(body.phone);

  if (!isIsoDate(date)) {
    return NextResponse.json(
      { error: "Date de sortie invalide." },
      { status: 400 }
    );
  }

  if (!formula) {
    return NextResponse.json({ error: "Formule invalide." }, { status: 400 });
  }

  if (!Number.isInteger(peopleCount) || peopleCount < 1 || peopleCount > 4) {
    return NextResponse.json(
      { error: "La reservation en ligne est limitee a 4 personnes." },
      { status: 400 }
    );
  }

  if (!firstName || !lastName || !email || !phone || !paymentType) {
    return NextResponse.json(
      { error: "Informations de reservation incompletes." },
      { status: 400 }
    );
  }

  const paidAmount =
    paymentType === "deposit" ? Math.round(formula.price * 0.3) : formula.price;
  let supabase;

  try {
    supabase = getSupabaseClient();
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("reservations_peche")
    .insert({
      date_sortie: date,
      formule: formula.id satisfies FormulaId,
      slots: formula.slots,
      nombre_personnes: peopleCount,
      responsable_prenom: firstName,
      responsable_nom: lastName,
      responsable_email: email,
      responsable_telephone: phone,
      montant_total: formula.price,
      montant_paye: paidAmount,
      type_paiement: paymentType,
      statut_paiement: "pending",
      paye: false,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return NextResponse.json(
      {
        error: error?.message || "Impossible d'enregistrer la reservation.",
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      },
      { status: 500 }
    );
  }

  const holdResponse = await fetch(new URL("/api/bateau/hold", request.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      activity: "peche",
      reservationTable: "reservations_peche",
      reservationId: data.id,
      date,
      slots: formula.slots,
    }),
  });

  if (!holdResponse.ok) {
    const responseText = await holdResponse.text();
    let payload: { error?: string; details?: string } = {};

    try {
      payload = responseText ? JSON.parse(responseText) : {};
    } catch {
      payload = { error: responseText };
    }

    return NextResponse.json(
      {
        error:
          holdResponse.status === 409
            ? "Ce creneau vient d'etre reserve. Choisissez une autre date ou formule."
            : payload.error || "Impossible de bloquer le creneau bateau.",
        details: payload.details,
      },
      { status: holdResponse.status === 409 ? 409 : 500 }
    );
  }

  return NextResponse.json({ reservationId: data.id }, { status: 201 });
}
