import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getSalonAdminClient } from "@/lib/salonAdmin";
import { buildPermisInvoicePdf } from "@/lib/permisInvoice";
import {
  getSalonPermisOffer,
  getSalonPermisValidUntil,
  isSalonPaymentMethod,
} from "@/lib/salonSales";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_FR = /^\d{2}\/\d{2}\/\d{4}$/;
const SLOTS = new Set([
  "07h00 - 09h00",
  "09h00 - 11h00",
  "11h00 - 13h00",
  "13h00 - 15h00",
  "15h00 - 17h00",
]);
function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function parseFrenchDate(value: string) {
  if (!DATE_FR.test(value)) return null;
  const [day, month, year] = value.split("/").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
}

export async function GET(request: Request) {
  if (!verifyAdminSession(request))
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  try {
    const supabase = getSalonAdminClient();
    const url = new URL(request.url);
    const courseDate = url.searchParams.get("courseDate");
    if (courseDate) {
      const { data, error } = await supabase
        .from("reservations")
        .select("creneau")
        .eq("date_cours", courseDate);
      if (error) throw error;
      return NextResponse.json({
        reservedSlots: (data || []).map((row) => row.creneau).filter(Boolean),
      });
    }
    const [sales, blockedExams] = await Promise.all([
      supabase
        .from("salon_sales")
        .select(
          "id,sold_at,client_prenom,client_nom,payment_method,montant_total,montant_encaisse,montant_solde,statut,facture_numero,facture_url,salon_sale_items(id,activity,offer_code,libelle,reservation_type,reservation_id,valid_until)",
        )
        .order("sold_at", { ascending: false })
        .limit(100),
      supabase.from("examens_bloques").select("date_examen"),
    ]);
    if (sales.error) throw sales.error;
    if (blockedExams.error) throw blockedExams.error;
    const rows = sales.data || [];
    const items = rows.flatMap((sale) => sale.salon_sale_items || []);
    const pecheReservationIds = items.filter((item) => item.activity === "peche" && item.reservation_type === "reservations_peche").map((item) => item.reservation_id);
    const pecheRightIds = items.filter((item) => item.activity === "peche" && item.reservation_type === "salon_peche_rights").map((item) => item.reservation_id);
    const [pecheReservations, pecheRights] = await Promise.all([
      pecheReservationIds.length ? supabase.from("reservations_peche").select("id,date_sortie,statut_paiement").in("id", pecheReservationIds) : Promise.resolve({ data: [], error: null }),
      pecheRightIds.length ? supabase.from("salon_peche_rights").select("id,status").in("id", pecheRightIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (pecheReservations.error || pecheRights.error) throw pecheReservations.error || pecheRights.error;
    const reservationsById = new Map((pecheReservations.data || []).map((row) => [row.id, row]));
    const rightsById = new Map((pecheRights.data || []).map((row) => [row.id, row]));
    for (const item of items) if (item.activity === "peche") {
      const reservation = reservationsById.get(item.reservation_id);
      const right = rightsById.get(item.reservation_id);
      Object.assign(item, { sortie_date: reservation?.date_sortie || null, fulfillment_status: reservation?.statut_paiement || right?.status || "reserved" });
    }
    return NextResponse.json({
      sales: rows,
      blockedExams: (blockedExams.data || []).map((row) => row.date_examen),
    });
  } catch (error) {
    console.error("Chargement Admin Salon", error);
    return NextResponse.json(
      {
        error:
          "Impossible de charger les ventes Salon. La migration est-elle appliquée ?",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!verifyAdminSession(request))
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });

  try {
    const body = (await request.json()) as {
      saleId?: unknown;
      itemId?: unknown;
    };
    const saleId = text(body.saleId);
    const itemId = text(body.itemId);
    if (!saleId || !itemId)
      return NextResponse.json(
        { error: "Vente ou prestation manquante." },
        { status: 400 },
      );

    const supabase = getSalonAdminClient();
    const itemLookup = await supabase
      .from("salon_sale_items")
      .select("activity")
      .eq("id", itemId)
      .eq("sale_id", saleId)
      .maybeSingle();
    if (itemLookup.error) throw itemLookup.error;
    const deletion = await supabase.rpc(
      itemLookup.data?.activity === "baleines"
        ? "admin_delete_salon_baleines_item"
        : itemLookup.data?.activity === "peche"
          ? "admin_delete_salon_peche_item"
        : "admin_delete_salon_sale_item",
      {
      p_sale_id: saleId,
      p_item_id: itemId,
      },
    );

    if (deletion.error) {
      const message = deletion.error.message || "";
      if (message.includes("déjà été utilisé")) {
        return NextResponse.json(
          { error: message },
          { status: 409 },
        );
      }
      if (message.includes("passée"))
        return NextResponse.json({ error: message }, { status: 409 });
      console.error("Suppression vente Admin Salon", deletion.error);
      return NextResponse.json(
        { error: "Impossible de supprimer cette vente Salon." },
        { status: 500 },
      );
    }

    const result = deletion.data as {
      deleted?: boolean;
      invoicePath?: string | null;
    } | null;
    if (!result?.deleted)
      return NextResponse.json(
        { error: "Vente Salon introuvable." },
        { status: 404 },
      );

    let warning: string | undefined;
    if (result.invoicePath) {
      const removal = await supabase.storage
        .from("documents-permis")
        .remove([result.invoicePath]);
      if (removal.error) {
        console.error("Nettoyage facture Salon Storage", removal.error);
        warning =
          "La vente a été supprimée, mais le fichier PDF n’a pas pu être nettoyé du Storage.";
      }
    }

    return NextResponse.json({ ok: true, warning });
  } catch (error) {
    console.error("Suppression vente Admin Salon", error);
    return NextResponse.json(
      { error: "Impossible de supprimer cette vente Salon." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!verifyAdminSession(request))
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const offer = getSalonPermisOffer(body.offerCode);
    const firstName = text(body.firstName);
    const lastName = text(body.lastName);
    const phone = text(body.phone);
    const email = text(body.email).toLowerCase();
    const paymentMethod = body.paymentMethod;
    const paymentReference = text(body.paymentReference);
    const bookingLater = body.bookingLater === true;
    const exam = bookingLater ? "Plus tard" : text(body.exam);
    const courseDate = bookingLater ? "" : text(body.courseDate);
    const slot = bookingLater ? "" : text(body.slot);
    const comment = text(body.comment);
    if (!offer || !firstName || !lastName || !phone)
      return NextResponse.json(
        { error: "Informations obligatoires incomplètes." },
        { status: 400 },
      );
    if (email && !EMAIL.test(email))
      return NextResponse.json(
        { error: "Adresse e-mail invalide." },
        { status: 400 },
      );
    if (!isSalonPaymentMethod(paymentMethod))
      return NextResponse.json(
        { error: "Moyen de paiement invalide." },
        { status: 400 },
      );
    const examDate = bookingLater ? null : parseFrenchDate(exam);
    const practicalDate = bookingLater ? null : parseFrenchDate(courseDate);
    if (!bookingLater && (!examDate || !practicalDate || !SLOTS.has(slot)))
      return NextResponse.json(
        { error: "Examen, cours ou créneau invalide." },
        { status: 400 },
      );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (examDate && (examDate < today || examDate.getDay() !== 3))
      return NextResponse.json(
        { error: "La date d’examen est invalide." },
        { status: 400 },
      );
    if (
      practicalDate &&
      (practicalDate < today || (examDate && practicalDate >= examDate))
    )
      return NextResponse.json(
        { error: "Le cours pratique doit précéder l’examen." },
        { status: 400 },
      );
    if (practicalDate?.getDay() === 3 && Number(slot.slice(0, 2)) < 13)
      return NextResponse.json(
        { error: "Le mercredi matin est réservé aux examens." },
        { status: 400 },
      );
    if (
      [firstName, lastName].some((value) => value.length > 100) ||
      phone.length > 50 ||
      email.length > 254 ||
      paymentReference.length > 200 ||
      comment.length > 1000
    )
      return NextResponse.json(
        { error: "Un ou plusieurs champs sont trop longs." },
        { status: 400 },
      );

    const supabase = getSalonAdminClient();
    if (examDate) {
      const [day, month, year] = exam.split("/");
      const blockedExam = await supabase
        .from("examens_bloques")
        .select("id")
        .eq("date_examen", `${year}-${month}-${day}`)
        .maybeSingle();
      if (blockedExam.error) throw blockedExam.error;
      if (blockedExam.data)
        return NextResponse.json(
          { error: "Cette date d’examen n’est plus disponible." },
          { status: 409 },
        );
    }
    const { data, error } = await supabase.rpc("create_salon_permis_sale", {
      p_offer_code: offer.code,
      p_formula: offer.formula,
      p_label: offer.label,
      p_price: offer.price,
      p_valid_until: getSalonPermisValidUntil(),
      p_prenom: firstName,
      p_nom: lastName,
      p_telephone: phone,
      p_email: email,
      p_payment_method: paymentMethod,
      p_payment_reference: paymentReference,
      p_commentaire: comment,
      p_examen: exam,
      p_course_later: bookingLater,
      p_date_cours: courseDate,
      p_type_cours: "individuel",
      p_creneau: slot,
    });
    if (error) {
      const conflict = error.code === "23505";
      return NextResponse.json(
        {
          error: conflict ? "Ce créneau vient d’être réservé." : error.message,
        },
        { status: conflict ? 409 : 400 },
      );
    }
    const created = Array.isArray(data) ? data[0] : data;
    if (!created?.sale_id || !created?.reservation_id)
      throw new Error("Résultat RPC incomplet.");
    const [reservationResult, itemResult] = await Promise.all([
      supabase
        .from("reservations")
        .select("*")
        .eq("id", created.reservation_id)
        .single(),
      supabase
        .from("salon_sale_items")
        .select("valid_until")
        .eq("id", created.item_id)
        .single(),
    ]);
    if (reservationResult.error || !reservationResult.data)
      throw reservationResult.error || new Error("Réservation introuvable.");
    if (itemResult.error || !itemResult.data?.valid_until)
      throw itemResult.error || new Error("Snapshot de validité introuvable.");
    const invoice = buildPermisInvoicePdf(reservationResult.data, new Date(), {
      validUntil: itemResult.data.valid_until,
    });
    const invoicePath = `factures/salon/${invoice.invoiceNumber}.pdf`;
    const upload = await supabase.storage
      .from("documents-permis")
      .upload(invoicePath, invoice.pdf, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upload.error) {
      return NextResponse.json(
        {
          saleId: created.sale_id,
          reservationId: created.reservation_id,
          invoiceNumber: null,
          emailAvailable: Boolean(email),
          warning:
            "Vente et réservation enregistrées. La facture reste en attente de génération.",
        },
        { status: 201 },
      );
    }
    const now = new Date().toISOString();
    const [saleUpdate, reservationUpdate] = await Promise.all([
      supabase
        .from("salon_sales")
        .update({
          facture_numero: invoice.invoiceNumber,
          facture_url: invoicePath,
          facture_generee_at: now,
          statut: "paid",
        })
        .eq("id", created.sale_id),
      supabase
        .from("reservations")
        .update({
          facture_numero: invoice.invoiceNumber,
          facture_url: invoicePath,
        })
        .eq("id", created.reservation_id),
    ]);
    if (saleUpdate.error || reservationUpdate.error)
      throw saleUpdate.error || reservationUpdate.error;
    return NextResponse.json(
      {
        saleId: created.sale_id,
        reservationId: created.reservation_id,
        invoiceNumber: invoice.invoiceNumber,
        emailAvailable: Boolean(email),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Création vente Salon Permis", error);
    return NextResponse.json(
      { error: "Impossible de créer la vente Salon." },
      { status: 500 },
    );
  }
}
