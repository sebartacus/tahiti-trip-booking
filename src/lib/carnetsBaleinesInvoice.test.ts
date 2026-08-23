import { buildCarnetBaleinesInvoicePdf } from "./carnetsBaleinesInvoice";

function assert(condition: boolean, message: string) { if (!condition) throw new Error(message); }
for (const item of [{ credits: 5, price: 55_000 }, { credits: 10, price: 100_000 }]) {
  const content = buildCarnetBaleinesInvoicePdf({ id: `salon-${item.credits}`, code: `TEST${item.credits}`, credits: item.credits, prenom: "Client", nom: "Salon", prix: item.price, dateExpiration: "2027-11-20", modePaiement: "Carte bancaire / TPE" }, new Date("2026-08-23T12:00:00-10:00"), { salonValidity: true }).pdf.toString("latin1");
  assert(content.includes(`Carnet Baleines ${item.credits} sorties`), "Le libellé du carnet est incorrect.");
  assert(content.includes(String(item.price)), "Le tarif Salon est incorrect.");
  assert(content.includes("Carte bancaire / TPE"), "Le paiement est absent.");
  assert(content.includes("Validite de l'offre : jusqu'au 20 novembre 2027"), "La validité Salon est absente.");
}
