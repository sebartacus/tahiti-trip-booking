import { formatInvoiceValidityDate, getInvoiceValidityText } from "./invoiceValidity";

function assert(condition: boolean, message: string) { if (!condition) throw new Error(message); }
assert(formatInvoiceValidityDate("2027-01-31") === "31 janvier 2027", "Validité Permis/Pêche/Charter incorrecte.");
assert(formatInvoiceValidityDate("2027-11-20") === "20 novembre 2027", "Validité Carnet Baleines incorrecte.");
assert(getInvoiceValidityText("2027-01-31") === "Validité de l'offre : jusqu'au 31 janvier 2027", "Mention de validité incorrecte.");
