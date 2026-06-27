export type CalendarMonth = {
  name: string;
  month: number;
  year: number;
};

export const MONTHS: CalendarMonth[] = [
  { name: "Juillet 2026", month: 7, year: 2026 },
  { name: "Août 2026", month: 8, year: 2026 },
  { name: "Septembre 2026", month: 9, year: 2026 },
  { name: "Octobre 2026", month: 10, year: 2026 },
  { name: "Novembre 2026", month: 11, year: 2026 },
];

export function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

export function firstDay(month: number, year: number) {
  let day = new Date(year, month - 1, 1).getDay();

  if (day === 0) return 6;

  return day - 1;
}