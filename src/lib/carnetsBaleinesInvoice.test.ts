import { buildCarnetBaleinesInvoicePdf } from "./carnetsBaleinesInvoice";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const regularInvoice = buildCarnetBaleinesInvoicePdf({
  id: "regular-5",
  code: "REGULAR5",
  credits: 5,
  prenom: "Client",
  nom: "Normal",
  prix: 65_000,
}).pdf.toString("latin1");
assert(
  regularInvoice.includes("TVA non applicable"),
  "Le rendu hors Salon des carnets doit rester inchangé.",
);
for (const item of [
  { credits: 5, price: 55_000, ht: "52 381", tva: "2 619" },
  { credits: 10, price: 100_000, ht: "95 238", tva: "4 762" },
]) {
  const content = buildCarnetBaleinesInvoicePdf(
    {
      id: `salon-${item.credits}`,
      code: `TEST${item.credits}`,
      credits: item.credits,
      prenom: "Client",
      nom: "Salon",
      prix: item.price,
      dateExpiration: "2027-11-20",
      modePaiement: "Carte bancaire / TPE",
    },
    new Date("2026-08-23T12:00:00-10:00"),
    { salonValidity: true },
  ).pdf.toString("latin1");
  assert(
    content.includes(`Carnet Baleines ${item.credits} sorties`),
    "Le libellé du carnet est incorrect.",
  );
  assert(content.includes(String(item.price)), "Le tarif Salon est incorrect.");
  assert(content.includes("Carte bancaire / TPE"), "Le paiement est absent.");
  assert(
    content.includes(`Total HT : ${item.ht} F CFP`),
    "Le total HT Salon est incorrect.",
  );
  assert(
    content.includes(`TVA 5 % : ${item.tva} F CFP`),
    "La TVA Salon est incorrecte.",
  );
  assert(
    content.includes(
      `Total TTC : ${String(item.price).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} F CFP`,
    ),
    "Le total TTC Salon est incorrect.",
  );
  assert(
    !content.includes("TVA non applicable"),
    "La facture Salon ne doit pas indiquer une TVA non applicable.",
  );
  assert(
    content.includes("Validite de l'offre : jusqu'au 20 novembre 2027"),
    "La validité Salon est absente.",
  );
}
