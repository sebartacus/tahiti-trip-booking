import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getSalonAdminClient } from "@/lib/salonAdmin";
import { sendPermisReservationEmails } from "@/lib/permisEmail";
import { sendCarnetBaleinesPurchaseEmails } from "@/lib/carnetsBaleinesEmail";
import { sendResendEmail } from "@/lib/baleinesEmail";

function baseUrl(request: Request) {
  return new URL(request.url).origin;
}
export async function POST(request: Request) {
  if (!verifyAdminSession(request))
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  const body = (await request.json()) as { id?: unknown };
  const id = typeof body.id === "string" ? body.id : "";
  const supabase = getSalonAdminClient();
  const sale = await supabase
    .from("salon_sales")
    .select(
      "id,client_prenom,client_nom,client_email,facture_numero,facture_url,salon_sale_items(activity,libelle,reservation_type,reservation_id,valid_until,total_price)",
    )
    .eq("id", id)
    .single();
  const item = Array.isArray(sale.data?.salon_sale_items)
    ? sale.data.salon_sale_items[0]
    : sale.data?.salon_sale_items;
  if (
    sale.error ||
    !sale.data?.client_email ||
    !sale.data.facture_url ||
    !item?.reservation_id
  )
    return NextResponse.json(
      { error: "Vente, e-mail ou facture indisponible." },
      { status: 400 },
    );
  const file = await supabase.storage
    .from("documents-permis")
    .download(sale.data.facture_url);
  if (file.error || !file.data)
    return NextResponse.json(
      { error: "Impossible de préparer l’e-mail." },
      { status: 500 },
    );
  const invoicePdf = Buffer.from(await file.data.arrayBuffer());
  let result;
  if (item.activity === "carnet_baleines") {
    const carnet = await supabase
      .from("carnets_baleines")
      .select("id,code,type_carnet,prenom_acheteur,nom_acheteur,email")
      .eq("id", item.reservation_id)
      .single();
    if (carnet.error || !carnet.data || !item.valid_until)
      return NextResponse.json(
        { error: "Carnet Baleines introuvable." },
        { status: 404 },
      );
    result = await sendCarnetBaleinesPurchaseEmails({
      carnet: {
        code: String(carnet.data.code),
        credits: Number(carnet.data.type_carnet),
        dateExpiration: item.valid_until,
        email: sale.data.client_email,
        nom: String(carnet.data.nom_acheteur),
        prenom: String(carnet.data.prenom_acheteur),
        prix: Number(item.total_price),
      },
      invoiceNumber: sale.data.facture_numero,
      invoicePdf,
      idempotencySuffix: `salon-${id}`,
    });
  } else if (item.activity === "peche") {
    result = await sendResendEmail({ from: process.env.EMAIL_FROM || "Tahiti Trip Fishing <onboarding@resend.dev>", to: [sale.data.client_email], subject: "Votre achat Pêche Salon", html: `<div style="font-family:Arial,sans-serif"><h1>Votre achat Pêche Salon</h1><p>Bonjour ${sale.data.client_prenom},</p><p>Votre achat <strong>${item.libelle}</strong> est enregistré.</p><p>${item.reservation_type === "salon_peche_rights" ? "Contactez-nous pour fixer votre date avant le 31 janvier 2027." : "Votre sortie est réservée."}</p><p>Votre facture est jointe.</p></div>`, attachments: [{ filename: `${sale.data.facture_numero}.pdf`, content: invoicePdf.toString("base64") }] }, fetch, `salon-peche-${id}`);
  } else if (item.activity === "baleines") {
    result = await sendResendEmail(
      {
        from:
          process.env.EMAIL_FROM ||
          "Tahiti Trip Fishing <onboarding@resend.dev>",
        to: [sale.data.client_email],
        subject: "Votre achat Baleines Salon",
        html: `<div style="font-family:Arial,sans-serif"><h1>Votre achat Baleines Salon</h1><p>Bonjour ${sale.data.client_prenom},</p><p>Votre achat <strong>${item.libelle}</strong> est enregistré.</p>${item.reservation_type === "salon_baleines_rights" ? "<p>Contactez-nous pour fixer la date de votre sortie. Les participants devront être sur la même sortie pour l’offre 5+1.</p>" : "<p>Votre sortie Baleines est réservée.</p>"}<p>Votre facture est jointe.</p></div>`,
        attachments: [
          {
            filename: `${sale.data.facture_numero}.pdf`,
            content: invoicePdf.toString("base64"),
          },
        ],
      },
      fetch,
      `salon-baleines-${id}`,
    );
  } else {
    const reservation = await supabase
      .from("reservations")
      .select("*")
      .eq("id", item.reservation_id)
      .single();
    if (reservation.error || !reservation.data)
      return NextResponse.json(
        { error: "Réservation Permis introuvable." },
        { status: 404 },
      );
    result = await sendPermisReservationEmails({
      reservation: reservation.data,
      invoicePdf,
      invoiceNumber: sale.data.facture_numero,
      baseUrl: baseUrl(request),
    });
  }
  if (!("ok" in result) || !result.ok)
    return NextResponse.json(
      { error: "Impossible d’envoyer la facture." },
      { status: 500 },
    );
  const now = new Date().toISOString();
  const linkedUpdate =
    item.activity === "carnet_baleines"
      ? supabase
          .from("carnets_baleines")
          .update({ email_sent: true, email_sent_at: now })
          .eq("id", item.reservation_id)
      : item.activity === "peche" && item.reservation_type === "reservations_peche"
        ? supabase.from("reservations_peche").update({ email_sent: true, email_sent_at: now }).eq("id", item.reservation_id)
      : item.activity === "peche"
        ? Promise.resolve({ error: null })
      : item.activity === "baleines" &&
          item.reservation_type === "reservations_baleines"
        ? supabase
            .from("reservations_baleines")
            .update({ email_sent: true, email_sent_at: now })
            .eq("id", item.reservation_id)
        : item.activity === "baleines"
          ? Promise.resolve({ error: null })
          : supabase
              .from("reservations")
              .update({ email_sent: true, email_sent_at: now })
              .eq("id", item.reservation_id);
  await Promise.all([
    supabase
      .from("salon_sales")
      .update({ facture_envoyee_at: now })
      .eq("id", id),
    linkedUpdate,
  ]);
  return NextResponse.json({ ok: true });
}
