import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getPermisServerClient } from "@/lib/permisServer";
import { getPermisAdminPrice } from "@/lib/permisAdmin";
import { createPaymentIntentToken } from "@/lib/payment-intent";
import { buildPermisInvoicePdf } from "@/lib/permisInvoice";
import { sendPermisReservationEmails } from "@/lib/permisEmail";

const FORMULAS = new Set(["Classique", "Sérénité"]);
const PAYMENT_MODES = new Set(["payzen_manual", "payzen", "especes", "cheque", "tpe"]);
const COURSE_TYPES = new Set(["individuel"]);
const SLOT_PATTERN = /^(\d{2})h(\d{2}) - (\d{2})h(\d{2})$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_FR_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const INDIVIDUAL_SLOTS = new Set(["07h00 - 09h00", "09h00 - 11h00", "11h00 - 13h00", "13h00 - 15h00", "15h00 - 17h00"]);

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function slotRange(value: string) {
  const match = SLOT_PATTERN.exec(value);
  if (!match) return null;
  return { start: Number(match[1]) * 60 + Number(match[2]), end: Number(match[3]) * 60 + Number(match[4]) };
}

function overlaps(left: string, right: string) {
  const a = slotRange(left);
  const b = slotRange(right);
  return Boolean(a && b && a.start < b.end && b.start < a.end);
}

function parseFrenchDate(value: string) {
  const match = DATE_FR_PATTERN.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 12);
  return date.getFullYear() === Number(match[3]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[1]) ? date : null;
}

function baseUrl(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  return host ? `${request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "")}://${host}` : url.origin;
}

export async function POST(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }
    // Only the tariff choice is accepted; the client cannot supply a price.
    if (["pricing_amount", "montant", "amount", "price"].some(key => key in body)) {
      return NextResponse.json({ error: "Le montant est calculé par le serveur." }, { status: 400 });
    }
    const formule = text(body.formule);
    const prenom = text(body.prenom);
    const nom = text(body.nom);
    const prenom2 = text(body.prenom2);
    const nom2 = text(body.nom2);
    const telephone = text(body.telephone);
    const email = text(body.email);
    const examen = text(body.examen);
    const dateCours = text(body.date_cours);
    const typeCours = text(body.type_cours);
    const creneau = text(body.creneau);
    const modePaiement = text(body.mode_paiement);
    const rawReferencePaiement = text(body.reference_paiement);
    const referencePaiement = modePaiement === "cheque" || modePaiement === "tpe" ? rawReferencePaiement : "";

    if (!FORMULAS.has(formule) || !prenom || !nom || !telephone || !examen) {
      return NextResponse.json({ error: "Les informations obligatoires sont incomplètes." }, { status: 400 });
    }
    if (email && !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: "L’adresse e-mail est invalide." }, { status: 400 });
    }
    if (!PAYMENT_MODES.has(modePaiement)) {
      return NextResponse.json({ error: "Le mode de paiement est invalide." }, { status: 400 });
    }
    if ([prenom, nom, prenom2, nom2].some((value) => value.length > 100) || telephone.length > 50 || email.length > 254 || referencePaiement.length > 200) {
      return NextResponse.json({ error: "Un ou plusieurs champs sont trop longs." }, { status: 400 });
    }

    const courseLater = body.cours_plus_tard === true;
    const courseDate = parseFrenchDate(dateCours);
    const allowedSlots = INDIVIDUAL_SLOTS;
    if (!courseLater && (!courseDate || courseDate < new Date(new Date().setHours(0, 0, 0, 0)) || !COURSE_TYPES.has(typeCours) || !allowedSlots.has(creneau))) {
      return NextResponse.json({ error: "Le cours pratique et son créneau sont obligatoires." }, { status: 400 });
    }
    if (!courseLater && courseDate?.getDay() === 3 && (slotRange(creneau)?.start || 0) < 13 * 60) {
      return NextResponse.json({ error: "Le mercredi matin est réservé aux examens." }, { status: 400 });
    }
    if (prenom2 || nom2 || typeCours === "commun" || (body.nombreParticipants !== undefined && body.nombreParticipants !== 1)) {
      return NextResponse.json({ error: "Créez une réservation distincte par candidat." }, { status: 400 });
    }
    if (examen !== "Plus tard") {
      const examDate = parseFrenchDate(examen);
      if (!examDate || examDate.getDay() !== 3 || examDate < new Date()) {
        return NextResponse.json({ error: "La date d’examen est invalide." }, { status: 400 });
      }
      if (!courseLater && courseDate && courseDate >= examDate) {
        return NextResponse.json({ error: "Le cours pratique doit avoir lieu avant l’examen." }, { status: 400 });
      }
    }

    // Keep the historic admin endpoint default for older clients; the form sends its choice.
    const pricing = getPermisAdminPrice(formule, body.pricing_type ?? "salon_tourisme");
    if (!pricing) return NextResponse.json({ error: "Tarif admin invalide." }, { status: 400 });
    const amount = pricing.pricing_amount;
    const supabase = getPermisServerClient();

    if (examen !== "Plus tard") {
      const [day, month, year] = examen.split("/");
      const blockedExam = await supabase.from("examens_bloques").select("id").eq("date_examen", `${year}-${month}-${day}`).maybeSingle();
      if (blockedExam.error) throw blockedExam.error;
      if (blockedExam.data) return NextResponse.json({ error: "Cette date d’examen n’est plus disponible." }, { status: 409 });
    }

    if (!courseLater) {
      const existing = await supabase.from("reservations").select("creneau").eq("date_cours", dateCours);
      if (existing.error) throw existing.error;
      if ((existing.data || []).some((item) => item.creneau && overlaps(creneau, item.creneau))) {
        return NextResponse.json({ error: "Ce créneau vient d’être réservé. Choisissez-en un autre." }, { status: 409 });
      }
    }

    const paidAt = modePaiement === "payzen" || modePaiement === "payzen_manual" ? null : new Date();
    const creation = await supabase.from("reservations").insert({
      prenom, nom, prenom2: null, nom2: null,
      telephone, email: email || null, formule, examen,
      date_cours: courseLater ? null : dateCours, type_cours: courseLater ? null : typeCours,
      creneau: courseLater ? null : creneau, paiement_effectue: Boolean(paidAt),
      pricing_type: pricing.pricing_type, pricing_amount: amount, mode_paiement: modePaiement === "payzen_manual" ? "payzen" : modePaiement,
      reference_paiement: referencePaiement || null, paid_at: paidAt?.toISOString() || null,
      origine_reservation: "salon_admin", statut: paidAt ? "Validé" : "En attente",
    }).select("*").single();

    if (creation.error || !creation.data) {
      console.error("Erreur réservation Permis Salon :", creation.error);
      return NextResponse.json({ error: "Impossible de créer la réservation." }, { status: 500 });
    }

    if (modePaiement === "payzen_manual") {
      return NextResponse.json({ ok: true, reservation: creation.data }, { status: 201 });
    }
    if (modePaiement === "payzen") {
      const payzen = await fetch(new URL("/api/payzen", request.url), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reservationId: String(creation.data.id), reservationTable: "reservations", activity: "permis", returnUrl: "/paiement-retour", paymentToken: createPaymentIntentToken({ reservationId: String(creation.data.id), reservationTable: "reservations", amount }) }),
      });
      const payment = await payzen.json();
      if (!payzen.ok) {
        await supabase.from("reservations").delete().eq("id", creation.data.id).eq("paiement_effectue", false);
        return NextResponse.json({ error: payment.error || "Impossible de préparer PayZen." }, { status: 500 });
      }
      return NextResponse.json({ ok: true, payment, reservation: creation.data }, { status: 201 });
    }

    const invoice = buildPermisInvoicePdf(creation.data, paidAt!);
    const invoicePath = `factures/permis/${invoice.invoiceNumber}.pdf`;
    const upload = await supabase.storage.from("documents-permis").upload(invoicePath, invoice.pdf, { contentType: "application/pdf", upsert: true });
    if (upload.error) {
      await supabase.from("reservations").delete().eq("id", creation.data.id);
      return NextResponse.json({ error: "Impossible de générer la facture. La réservation n’a pas été créée." }, { status: 500 });
    }
    const invoiceUpdate = await supabase.from("reservations").update({ facture_numero: invoice.invoiceNumber, facture_url: invoicePath }).eq("id", creation.data.id);
    if (invoiceUpdate.error) {
      await supabase.storage.from("documents-permis").remove([invoicePath]);
      await supabase.from("reservations").delete().eq("id", creation.data.id);
      return NextResponse.json({ error: "Impossible d’enregistrer la facture. La réservation n’a pas été créée." }, { status: 500 });
    }

    let warning = "";
    if (email) {
      const emailResult = await sendPermisReservationEmails({
        reservation: { ...creation.data, facture_numero: invoice.invoiceNumber, facture_url: invoicePath },
        invoicePdf: invoice.pdf, invoiceNumber: invoice.invoiceNumber, baseUrl: baseUrl(request),
      });
      if ("ok" in emailResult && emailResult.ok) {
        await supabase.from("reservations").update({ email_sent: true, email_sent_at: new Date().toISOString() }).eq("id", creation.data.id);
      } else warning = "La réservation est créée, mais l’e-mail n’a pas pu être envoyé.";
    }

    return NextResponse.json({ ok: true, warning, reservation: { ...creation.data, facture_numero: invoice.invoiceNumber, facture_url: invoicePath } }, { status: 201 });
  } catch (error) {
    console.error("Erreur serveur réservation Permis Salon :", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
