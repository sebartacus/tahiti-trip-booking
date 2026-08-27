export type SalonRedemptionNotification = {
  activity: "baleines" | "peche" | "charter";
  reservationId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  offer: string;
  date: string;
  endDate?: string;
  slot?: string;
  participants: number;
  composition?: Record<string, number>;
  invoiceNumber: string | null;
  total: number;
  paid: number;
  balance: number;
  paymentMethod: string;
  formula?: string;
  offerType?: string;
};

const activityLabels = { baleines: "Baleines", peche: "Pêche", charter: "Charter" } as const;
const paymentLabels: Record<string, string> = { tpe: "Carte bancaire / TPE", especes: "Espèces", cheque: "Chèque", virement: "Virement" };
const slotLabels: Record<string, string> = { morning: "Matin", afternoon: "Après-midi", "07:00": "07:00", "13:15": "13:15" };
const escapeHtml = (value: unknown) => String(value ?? "-").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
const money = (value: number) => `${Number(value || 0).toLocaleString("fr-FR")} F CFP`;

export function buildSalonRedemptionNotification(input: SalonRedemptionNotification) {
  const activity = activityLabels[input.activity];
  const payment = paymentLabels[input.paymentMethod] || input.paymentMethod || "-";
  const details: string[] = [];
  if (input.activity === "baleines") {
    const composition = input.composition || {};
    details.push(`Départ : ${slotLabels[input.slot || ""] || input.slot || "-"}`);
    details.push(`Mises à l’eau : ${Number(composition.mise_eau || 0)}`);
    details.push(`Observateurs : ${Number(composition.observateur || 0)}`);
    const children = Number(composition.enfant_moins_12 || 0) + Number(composition.enfant_moins_5 || 0);
    details.push(`Enfants : ${children}`);
  } else if (input.activity === "peche") {
    details.push(`Formule : ${input.formula === "full_day" ? "Journée complète" : "Demi-journée"}`);
    if (input.formula !== "full_day") details.push(`Créneau : ${slotLabels[input.slot || ""] || input.slot || "-"}`);
    details.push(`Type : ${input.offerType === "privatisation" ? "Privatisation" : input.offerType === "duo_plus_one" ? "2+1" : input.offerType || "-"}`);
  } else {
    details.push(`Date de départ : ${input.date}`);
    details.push(`Date de retour : ${input.endDate || "-"}`);
  }
  const balanceInstruction = input.balance > 0 ? `<p><strong>${input.activity === "charter" ? "Solde à régler au plus tard la veille du départ." : "Solde à régler le jour de la prestation."}</strong></p>` : "";
  const html = `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.55"><h1>RÉSERVATION SALON EFFECTUÉE DIRECTEMENT PAR LE CLIENT</h1><h2>Client</h2><p>${escapeHtml(input.firstName)} ${escapeHtml(input.lastName)}</p><p><strong>Téléphone :</strong> ${escapeHtml(input.phone)}<br><strong>E-mail :</strong> ${escapeHtml(input.email)}</p><h2>Réservation</h2><p><strong>Activité :</strong> ${activity}<br><strong>Offre :</strong> ${escapeHtml(input.offer)}<br><strong>Date :</strong> ${escapeHtml(input.date)}<br>${details.map(escapeHtml).join("<br>")}<br><strong>Participants :</strong> ${input.participants}</p><h2>FACTURATION</h2><p><strong>Numéro de facture :</strong> ${escapeHtml(input.invoiceNumber)}<br><strong>Total :</strong> ${money(input.total)}<br><strong>Déjà encaissé :</strong> ${money(input.paid)}<br><strong>Solde restant :</strong> ${money(input.balance)}<br><strong>Mode de paiement initial :</strong> ${escapeHtml(payment)}</p>${balanceInstruction}<p><strong>Cette réservation a été effectuée directement par le client depuis /reprendre-offre.</strong></p></div>`;
  return { subject: `Nouvelle réservation Salon – ${activity} – ${input.firstName} ${input.lastName}`, html };
}

export async function sendSalonRedemptionNotification(input: SalonRedemptionNotification, fetchFn: typeof fetch = fetch) {
  const recipient = process.env.INTERNAL_EMAIL || process.env.EMAIL_INTERNAL;
  const apiKey = process.env.RESEND_API_KEY;
  if (!recipient) return { skipped: true, reason: "Destinataire interne manquant" };
  if (!apiKey) return { skipped: true, reason: "RESEND_API_KEY manquante" };
  const content = buildSalonRedemptionNotification(input);
  const response = await fetchFn("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `salon-public-redemption-${input.reservationId}` }, body: JSON.stringify({ from: process.env.EMAIL_FROM || "Tahiti Trip Fishing <onboarding@resend.dev>", to: [recipient], ...content }) });
  if (!response.ok) return { error: await response.text().catch(() => "Erreur envoi notification Salon") };
  return { ok: true };
}
