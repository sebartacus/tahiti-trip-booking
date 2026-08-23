const FRENCH_MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
] as const;

export function formatInvoiceValidityDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError("Date de validité invalide.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError("Date de validité invalide.");
  }
  return `${day} ${FRENCH_MONTHS[month - 1]} ${year}`;
}

export function getInvoiceValidityText(validUntil: string) {
  return `Validité de l'offre : jusqu'au ${formatInvoiceValidityDate(validUntil)}`;
}
