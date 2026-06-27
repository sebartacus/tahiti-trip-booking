export type DepartureAvailability = {
  time: "07:00" | "13:15";
  waterRemaining: number;
  observerRemaining: number;
};

export const DEPARTURES: Record<
  string,
  DepartureAvailability[]
> = {
  "2026-07-20": [
    {
      time: "07:00",
      waterRemaining: 6,
      observerRemaining: 2,
    },
    {
      time: "13:15",
      waterRemaining: 5,
      observerRemaining: 2,
    },
  ],

  "2026-07-21": [
    {
      time: "07:00",
      waterRemaining: 3,
      observerRemaining: 2,
    },
    {
      time: "13:15",
      waterRemaining: 1,
      observerRemaining: 1,
    },
  ],

  "2026-07-22": [
    {
      time: "07:00",
      waterRemaining: 2,
      observerRemaining: 1,
    },
    {
      time: "13:15",
      waterRemaining: 0,
      observerRemaining: 0,
    },
  ],
};