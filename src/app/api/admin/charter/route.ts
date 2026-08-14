import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminSession } from "@/lib/adminSession";
import {
  getCharterSlotRequirements,
  isCharterFormula,
  isValidIsoDate,
} from "@/lib/charter-availability";
import {
  CHARTER_FORMULA_DETAILS,
  getCharterPrice,
  type SunsetDrink,
} from "@/lib/charter-pricing";

const PAYMENT_METHODS = ["cash", "check", "bank_transfer", "card_terminal"] as const;
const PAYMENT_STATUSES = ["unpaid", "deposit_paid", "paid"] as const;

type Body = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configuration Supabase Charter manquante.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  }
  try {
    const { data, error } = await adminClient()
      .from("reservations_charter")
      .select("id,date_debut,date_fin,formule,responsable_prenom,responsable_nom,responsable_tel,responsable_email,nombre_personnes,montant_total,montant_paye,montant_solde,type_paiement,statut_paiement,created_at,sunset_drink,champagne_supplement,reservation_manuelle")
      .order("date_debut", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ reservations: data || [] });
  } catch {
    return NextResponse.json({ error: "Impossible de charger les réservations Charter." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  }
  let body: Body;
  try { body = await request.json() as Body; }
  catch { return NextResponse.json({ error: "JSON invalide." }, { status: 400 }); }

  const formula = body.formule;
  const startDate = body.date_debut;
  const participants = Number(body.nombre_personnes);
  const firstName = text(body.responsable_prenom);
  const lastName = text(body.responsable_nom);
  const phone = text(body.responsable_tel);
  const email = text(body.responsable_email);
  const paymentMethod = body.type_paiement;
  const paymentStatus = body.statut_paiement;
  const champagne = body.champagne_supplement === true;
  const sleepingAccepted = body.sleeping_arrangement_accepted === true;
  const sunsetDrink = body.sunset_drink;

  if (!isCharterFormula(formula) || !isValidIsoDate(startDate)) {
    return NextResponse.json({ error: "Formule ou date invalide." }, { status: 400 });
  }
  if (!firstName || !lastName || !phone) {
    return NextResponse.json({ error: "Prénom, nom et téléphone sont obligatoires." }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }
  if (!Number.isInteger(participants) || participants < 1 || participants > CHARTER_FORMULA_DETAILS[formula].maxParticipants) {
    return NextResponse.json({ error: "Nombre de personnes invalide pour cette formule." }, { status: 400 });
  }
  if (!PAYMENT_METHODS.includes(paymentMethod as typeof PAYMENT_METHODS[number]) ||
      !PAYMENT_STATUSES.includes(paymentStatus as typeof PAYMENT_STATUSES[number])) {
    return NextResponse.json({ error: "Paiement manuel invalide." }, { status: 400 });
  }
  if (CHARTER_FORMULA_DETAILS[formula].isTetiaroa && participants === 9 && !sleepingAccepted) {
    return NextResponse.json({ error: "L’acceptation du couchage dans le carré est obligatoire à 9 personnes." }, { status: 400 });
  }
  const validDrink = sunsetDrink === "white_wine" || sunsetDrink === "champagne_included";
  if (formula === "sunset" && participants <= 2 && (!validDrink || champagne)) {
    return NextResponse.json({ error: "Choisissez la boisson incluse pour le Sunset." }, { status: 400 });
  }
  if (formula === "sunset" && participants >= 3 && sunsetDrink !== "white_wine") {
    return NextResponse.json({ error: "Le vin blanc doit être sélectionné pour ce Sunset." }, { status: 400 });
  }
  if (formula !== "sunset" && (sunsetDrink != null || champagne)) {
    return NextResponse.json({ error: "Option Sunset incohérente." }, { status: 400 });
  }

  const total = getCharterPrice(formula, participants, champagne);
  const paid = paymentStatus === "unpaid" ? 0 : paymentStatus === "paid" ? total : Math.round(total * 0.3);
  const { endDate, requiredSlots } = getCharterSlotRequirements(formula, startDate);

  try {
    const { data, error } = await adminClient().rpc("create_manual_charter_reservation", {
      p_date_debut: startDate, p_date_fin: endDate, p_formule: formula,
      p_nombre_personnes: participants, p_responsable_prenom: firstName,
      p_responsable_nom: lastName, p_responsable_email: email,
      p_responsable_tel: phone, p_montant_total: total, p_montant_paye: paid,
      p_montant_solde: total - paid, p_type_paiement: paymentMethod,
      p_statut_paiement: paymentStatus, p_sunset_drink: formula === "sunset" ? sunsetDrink as SunsetDrink : null,
      p_champagne_supplement: formula === "sunset" && champagne,
      p_sleeping_arrangement_accepted: sleepingAccepted, p_requested_slots: requiredSlots,
    });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.success) {
      return NextResponse.json({ error: "Un ou plusieurs créneaux bateau viennent d’être occupés. Aucune réservation n’a été créée.", conflicts: result?.conflicts || [] }, { status: 409 });
    }
    return NextResponse.json({ reservationId: result.reservation_id }, { status: 201 });
  } catch (error) {
    console.error("Création Charter admin", error);
    return NextResponse.json({ error: "Impossible de créer la réservation Charter." }, { status: 500 });
  }
}
