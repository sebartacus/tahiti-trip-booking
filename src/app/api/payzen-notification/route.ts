import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const formData = await request.formData();

  const statutPaiement = String(formData.get("vads_trans_status") || "");
  const email = String(formData.get("vads_cust_email") || "");
  const transactionId = String(formData.get("vads_trans_id") || "");

  console.log("Notification PayZen reçue", {
    statutPaiement,
    email,
    transactionId,
  });

  if (statutPaiement !== "AUTHORISED") {
    return NextResponse.json({
      ok: true,
      message: "Paiement non autorisé",
    });
  }

  if (!email) {
    return NextResponse.json(
      { error: "Email manquant" },
      { status: 400 }
    );
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
      { error: "Erreur mise à jour réservation" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Paiement validé",
  });
}