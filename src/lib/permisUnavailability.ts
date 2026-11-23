import { parsePermisSlot } from "./permisScheduling";

export type PermisTimeRange = { start: number; end: number };

export type PermisBlockDates = { date_debut: string; date_fin: string };

export type PermisBlock = PermisBlockDates & {
  id: string;
  debut_minute: number | null;
  fin_minute: number | null;
  motif: string | null;
};

export function permisSlotBlocked(slot: string, ranges: readonly PermisTimeRange[]) {
  const time = parsePermisSlot(slot);
  return !!time && ranges.some(range => time.start < range.end && range.start < time.end);
}
