const activityLabels: Record<string, string> = { permis: "Permis côtier", carnet_baleines: "Carnet Baleines", baleines: "Baleines", peche: "Pêche", charter: "Charter" };
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
const money = (value: number) => `${Number(value || 0).toLocaleString("fr-FR")} F CFP`;
export type SalonInvoiceEmailInput = { firstName: string; activity: string; offer: string; bookLater: boolean; balance: number };
export function buildSalonInvoiceAttachment(invoicePdf: Buffer, invoiceNumber: string) {
  if (invoicePdf.subarray(0,5).toString("ascii")!=="%PDF-") throw new Error("PDF invalide");
  return { filename: `Facture-Tahiti-Trip-Fishing-${invoiceNumber}.pdf`, content: invoicePdf.toString("base64") };
}
export function buildSalonInvoiceEmail(input: SalonInvoiceEmailInput) {
  const activity = activityLabels[input.activity] || input.activity;
  const booking = input.bookLater ? `<p><strong>Pour choisir votre date :</strong><br><a href="https://www.tahiti-trip.com/reprendre-offre">https://www.tahiti-trip.com/reprendre-offre</a></p><p>Munissez-vous de votre numéro de facture et du téléphone ou de l’e-mail utilisé lors de l’achat.</p>` : "";
  const balance = input.balance > 0 ? `<p><strong>Solde restant : ${money(input.balance)}</strong><br>${input.activity === "charter" ? "À régler au plus tard la veille du départ." : "À régler le jour de la prestation."}</p>` : "";
  return { subject: `Votre facture Tahiti Trip Fishing — ${activity}`, html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.55"><p>Ia Orana ${escapeHtml(input.firstName)},</p><p>Veuillez trouver ci-joint votre facture correspondant à votre achat.</p><p><strong>${escapeHtml(activity)} — ${escapeHtml(input.offer)}</strong></p>${booking}${balance}<p>Mauruuru,<br>Tahiti Trip Fishing</p></div>` };
}
