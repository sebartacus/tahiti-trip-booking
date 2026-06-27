export function formatXpf(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " F CFP";
}

export function formatDateFr(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date + "T12:00:00"));
}