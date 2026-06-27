export type DayStatus =
  | "available"
  | "limited"
  | "almost_full"
  | "full";

export type CalendarDayData = {
  date: string;
  status: DayStatus;
  waterRemaining: number;
  observerRemaining: number;
};

export const CALENDAR: CalendarDayData[] = [
  {
    date: "2026-07-20",
    status: "available",
    waterRemaining: 6,
    observerRemaining: 2,
  },
  {
    date: "2026-07-21",
    status: "limited",
    waterRemaining: 4,
    observerRemaining: 2,
  },
  {
    date: "2026-07-22",
    status: "almost_full",
    waterRemaining: 2,
    observerRemaining: 1,
  },
  {
    date: "2026-07-23",
    status: "full",
    waterRemaining: 0,
    observerRemaining: 0,
  },
];