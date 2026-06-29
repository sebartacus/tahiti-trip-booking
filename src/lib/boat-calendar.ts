export const BOAT_ACTIVITIES = ["baleines", "peche", "peche_nuit"] as const;
export const BOAT_STATUSES = ["available", "hold", "reserved", "blocked"] as const;
export const BOAT_SLOTS = ["morning", "afternoon"] as const;

export type BoatActivity = (typeof BOAT_ACTIVITIES)[number];
export type BoatStatus = (typeof BOAT_STATUSES)[number];
export type BoatSlot = (typeof BOAT_SLOTS)[number];

export type BoatCalendarSlot = {
  id: string;
  date: string;
  slot: BoatSlot;
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

export function isBoatSlot(value: unknown): value is BoatSlot {
  return typeof value === "string" && BOAT_SLOTS.includes(value as BoatSlot);
}

export function normalizeBoatSlots(value: unknown): BoatSlot[] {
  const rawSlots = Array.isArray(value) ? value : [value];
  const slots = rawSlots.filter(isBoatSlot);
  return BOAT_SLOTS.filter((slot) => slots.includes(slot));
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
