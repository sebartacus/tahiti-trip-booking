import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

    return NextResponse.json({
      ok: true,
      message: "Paiement Baleines valide",
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

    return NextResponse.json({
      ok: true,
      message: "Paiement Peche valide",
    });
  }

  if (!email) {
    return NextResponse.json({ error: "Email manquant" }, { status: 400 });
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
