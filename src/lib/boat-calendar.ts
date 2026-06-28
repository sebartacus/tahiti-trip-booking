export const BOAT_ACTIVITIES = ["baleines", "peche", "peche_nuit"] as const;
export const BOAT_STATUSES = ["available", "hold", "reserved", "blocked"] as const;

export type BoatActivity = (typeof BOAT_ACTIVITIES)[number];
export type BoatStatus = (typeof BOAT_STATUSES)[number];

export type BoatCalendarDay = {
  id: string;
  date: string;
  status: BoatStatus;
  activity: BoatActivity | null;
  reservation_id: string | null;
  reservation_table: string | null;
  blocked_reason: string | null;
  blocked_by: string | null;
  blocked_at: string | null;
  created_at: string;
  updated_at: string;
};

export function isBoatActivity(value: unknown): value is BoatActivity {
  return (
    typeof value === "string" &&
    BOAT_ACTIVITIES.includes(value as BoatActivity)
  );
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
