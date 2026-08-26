import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getSalonAdminClient } from "@/lib/salonAdmin";
import { buildPermisInvoicePdf } from "@/lib/permisInvoice";
import { buildCarnetBaleinesInvoicePdf } from "@/lib/carnetsBaleinesInvoice";
import { buildBaleinesInvoicePdf } from "@/lib/baleinesInvoice";
import { buildPecheInvoicePdf } from "@/lib/pecheInvoice";
import { buildCharterInvoicePdf } from "@/lib/charterInvoice";
import {
  SALON_PAYMENT_LABELS,
  type SalonPaymentMethod,
} from "@/lib/salonSales";

export async function GET(request: Request) {
  if (!verifyAdminSession(request))
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  const supabase = getSalonAdminClient();
  const sale = await supabase
    .from("salon_sales")
    .select("facture_url")
    .eq("id", id)
    .maybeSingle();
  if (sale.error || !sale.data?.facture_url)
    return NextResponse.json(
      { error: "Facture indisponible." },
      { status: 404 },
    );
  const signed = await supabase.storage
    .from("documents-permis")
    .createSignedUrl(sale.data.facture_url, 600);
  if (signed.error || !signed.data?.signedUrl)
    return NextResponse.json(
      { error: "Impossible d’ouvrir la facture." },
      { status: 500 },
    );
  return NextResponse.json({ url: signed.data.signedUrl });
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
      "id,client_prenom,client_nom,client_email,client_telephone,payment_method,montant_total,montant_encaisse,montant_solde,salon_sale_items(activity,libelle,reservation_type,reservation_id,valid_until,total_price)",
    )
    .eq("id", id)
    .single();
  const item = Array.isArray(sale.data?.salon_sale_items)
    ? sale.data.salon_sale_items[0]
    : sale.data?.salon_sale_items;
  if (sale.error || !item?.reservation_id)
    return NextResponse.json(
      { error: "Vente Salon introuvable." },
      { status: 404 },
    );
  if (item.activity !== "baleines" && !item.valid_until)
    return NextResponse.json(
      { error: "Snapshot de validité introuvable." },
      { status: 409 },
    );
  let invoice:
    | ReturnType<typeof buildPermisInvoicePdf>
    | ReturnType<typeof buildBaleinesInvoicePdf>
    | ReturnType<typeof buildPecheInvoicePdf>;
  if (item.activity === "carnet_baleines") {
    const carnet = await supabase
      .from("carnets_baleines")
      .select("id,code,type_carnet,prenom_acheteur,nom_acheteur")
      .eq("id", item.reservation_id)
      .single();
    if (carnet.error || !carnet.data)
      return NextResponse.json(
        { error: "Carnet Baleines introuvable." },
        { status: 404 },
      );
    invoice = buildCarnetBaleinesInvoicePdf(
      {
        id: String(carnet.data.id),
        code: String(carnet.data.code),
        credits: Number(carnet.data.type_carnet),
        prenom: String(carnet.data.prenom_acheteur),
        nom: String(carnet.data.nom_acheteur),
        prix: Number(item.total_price),
        dateExpiration: item.valid_until,
        modePaiement:
          SALON_PAYMENT_LABELS[sale.data.payment_method as SalonPaymentMethod],
      },
      new Date(),
      { salonValidity: true },
    );
  } else if (item.activity === "baleines") {
    let reservation;
    if (item.reservation_type === "reservations_baleines") {
      const lookup = await supabase
        .from("reservations_baleines")
        .select("*")
        .eq("id", item.reservation_id)
        .single();
      if (lookup.error || !lookup.data)
        return NextResponse.json(
          { error: "Réservation Baleines introuvable." },
          { status: 404 },
        );
      reservation = lookup.data;
    } else {
      const right = await supabase
        .from("salon_baleines_rights")
        .select("composition")
        .eq("id", item.reservation_id)
        .single();
      if (right.error || !right.data)
        return NextResponse.json(
          { error: "Droit Baleines introuvable." },
          { status: 404 },
        );
      reservation = {
        id: item.reservation_id,
        date_sortie: null,
        depart: null,
        responsable_prenom: sale.data.client_prenom,
        responsable_nom: sale.data.client_nom,
        responsable_email: sale.data.client_email,
        responsable_telephone: sale.data.client_telephone,
        participants: Array(
          Object.values(
            right.data.composition as Record<string, number>,
          ).reduce((sum, count) => sum + Number(count), 0),
        ).fill({}),
        montant_total: item.total_price,
        source_paiement: "salon_admin",
      };
    }
    invoice = buildBaleinesInvoicePdf(reservation, new Date(), {
      salon: true,
      designation: item.libelle,
      composition: item.libelle,
      paymentMethod:
        SALON_PAYMENT_LABELS[sale.data.payment_method as SalonPaymentMethod],
      validUntil: item.valid_until,
    });
  } else if (item.activity === "peche") {
    let reservation: Record<string, unknown>;
    if (item.reservation_type === "reservations_peche") {
      const lookup = await supabase.from("reservations_peche").select("*").eq("id", item.reservation_id).single();
      if (lookup.error || !lookup.data) return NextResponse.json({ error: "Réservation Pêche introuvable." }, { status: 404 });
      reservation = lookup.data;
    } else {
      const right = await supabase.from("salon_peche_rights").select("formule,nombre_personnes,montant_paye").eq("id", item.reservation_id).single();
      if (right.error || !right.data) return NextResponse.json({ error: "Droit Pêche introuvable." }, { status: 404 });
      reservation = { id: item.reservation_id, date_sortie: null, formule: right.data.formule === "full_day" ? "full_day" : "morning", slots: null, nombre_personnes: right.data.nombre_personnes, responsable_prenom: sale.data.client_prenom, responsable_nom: sale.data.client_nom, responsable_email: sale.data.client_email, responsable_telephone: sale.data.client_telephone, montant_paye: right.data.montant_paye };
    }
    invoice = buildPecheInvoicePdf(reservation as Parameters<typeof buildPecheInvoicePdf>[0], new Date(), { designation: item.libelle, paymentMethod: SALON_PAYMENT_LABELS[sale.data.payment_method as SalonPaymentMethod], validUntil: item.valid_until,totalTtc:sale.data.montant_total,amountPaid:sale.data.montant_encaisse,balance:sale.data.montant_solde });
  } else if (item.activity === "charter") {
    let reservation: Record<string, unknown>;
    if (item.reservation_type === "reservations_charter") {
      const lookup=await supabase.from("reservations_charter").select("*").eq("id",item.reservation_id).single();
      if(lookup.error||!lookup.data)return NextResponse.json({error:"Réservation Charter introuvable."},{status:404});reservation=lookup.data;
    } else {
      const right=await supabase.from("salon_charter_rights").select("nombre_personnes,montant_paye").eq("id",item.reservation_id).single();
      if(right.error||!right.data)return NextResponse.json({error:"Droit Charter introuvable."},{status:404});reservation={id:item.reservation_id,date_debut:"Date à fixer",date_fin:"Date à fixer",formule:"tetiaroa_2j_1n",nombre_personnes:right.data.nombre_personnes,responsable_prenom:sale.data.client_prenom,responsable_nom:sale.data.client_nom,responsable_email:sale.data.client_email||"",responsable_tel:sale.data.client_telephone,montant_total:item.total_price,montant_paye:sale.data.montant_encaisse,montant_solde:sale.data.montant_solde,type_paiement:sale.data.montant_solde>0?"deposit":"full",sunset_drink:null,champagne_supplement:false};
    }
    invoice=buildCharterInvoicePdf(reservation as Parameters<typeof buildCharterInvoicePdf>[0],new Date(),{salon:true,paymentMethod:SALON_PAYMENT_LABELS[sale.data.payment_method as SalonPaymentMethod],validUntil:item.valid_until});
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
    invoice = buildPermisInvoicePdf(reservation.data, new Date(), {
      validUntil: item.valid_until,
    });
  }
  const invoicePath = `factures/salon/${invoice.invoiceNumber}.pdf`;
  const upload = await supabase.storage
    .from("documents-permis")
    .upload(invoicePath, invoice.pdf, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (upload.error)
    return NextResponse.json(
      { error: "Impossible de générer la facture." },
      { status: 500 },
    );
  const now = new Date().toISOString();
  const linkedUpdate =
    item.activity === "carnet_baleines"
      ? supabase
          .from("carnets_baleines")
          .update({
            facture_numero: invoice.invoiceNumber,
            facture_url: invoicePath,
          })
          .eq("id", item.reservation_id)
      : item.activity === "charter" && item.reservation_type === "reservations_charter"
        ? supabase.from("reservations_charter").update({facture_numero:invoice.invoiceNumber,facture_url:invoicePath}).eq("id",item.reservation_id)
      : item.activity === "charter" ? Promise.resolve({error:null})
      : item.activity === "peche" && item.reservation_type === "reservations_peche"
        ? supabase.from("reservations_peche").update({ facture_numero: invoice.invoiceNumber, facture_url: invoicePath }).eq("id", item.reservation_id)
      : item.activity === "peche"
        ? Promise.resolve({ error: null })
      : item.activity === "baleines" &&
          item.reservation_type === "reservations_baleines"
        ? supabase
            .from("reservations_baleines")
            .update({
              facture_numero: invoice.invoiceNumber,
              facture_url: invoicePath,
            })
            .eq("id", item.reservation_id)
        : item.activity === "baleines"
          ? Promise.resolve({ error: null })
          : supabase
              .from("reservations")
              .update({
                facture_numero: invoice.invoiceNumber,
                facture_url: invoicePath,
              })
              .eq("id", item.reservation_id);
  const [saleUpdate, reservationUpdate] = await Promise.all([
    supabase
      .from("salon_sales")
      .update({
        facture_numero: invoice.invoiceNumber,
        facture_url: invoicePath,
        facture_generee_at: now,
        statut: "paid",
      })
      .eq("id", id),
    linkedUpdate,
  ]);
  if (saleUpdate.error || reservationUpdate.error)
    return NextResponse.json(
      { error: "Facture créée, mais son état n’a pas pu être enregistré." },
      { status: 500 },
    );
  return NextResponse.json({ invoiceNumber: invoice.invoiceNumber });
}
