import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's type-stripping runner requires the source extension.
import { buildSalonInvoiceAttachment, buildSalonInvoiceEmail } from "./salonInvoiceEmail.ts";
test("Date à fixer contient le lien et le solde Pêche",()=>{const email=buildSalonInvoiceEmail({firstName:"Rose",activity:"peche",offer:"Privatisation",bookLater:true,balance:55300});assert.match(email.subject,/Pêche/);assert.match(email.html,/reprendre-offre/);assert.match(email.html,/55 300 F CFP/);assert.match(email.html,/jour de la prestation/)});
test("Charter utilise l’échéance Charter",()=>{assert.match(buildSalonInvoiceEmail({firstName:"Maui",activity:"charter",offer:"Tetiaroa",bookLater:true,balance:203000}).html,/veille du départ/)});
test("paiement intégral et prestation datée n’ajoutent aucun faux message",()=>{const html=buildSalonInvoiceEmail({firstName:"Élodie",activity:"baleines",offer:"Sortie",bookLater:false,balance:0}).html;assert.doesNotMatch(html,/reprendre-offre/);assert.doesNotMatch(html,/Solde restant/)});
test("contenu client est échappé",()=>{const html=buildSalonInvoiceEmail({firstName:"<script>",activity:"peche",offer:"<b>Offre</b>",bookLater:false,balance:0}).html;assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/)});
test("pièce jointe conserve le PDF existant et le bon nom",()=>{const pdf=Buffer.from("%PDF-1.4\nexisting invoice");const attachment=buildSalonInvoiceAttachment(pdf,"SALON-123");assert.equal(attachment.filename,"Facture-Tahiti-Trip-Fishing-SALON-123.pdf");assert.deepEqual(Buffer.from(attachment.content,"base64"),pdf);assert.throws(()=>buildSalonInvoiceAttachment(Buffer.from("not a pdf"),"BAD"),/PDF invalide/)});
