export type SalonCalendarStatus = "available" | "limited" | "unavailable" | "outside";
type BaleinesSlot = { miseEau: number; observateurs: number; boatAvailable: boolean };
type PecheSlot = { used: number; boatAvailable: boolean };
type CharterSlot = { date: string; slot: string; status: string; expires_at?: string | null };

export function baleinesDayStatus(slots: BaleinesSlot[], miseEau: number, participants: number): SalonCalendarStatus {
  const observateurs = participants - miseEau;
  const compatible = slots.filter((slot) => slot.boatAvailable && slot.miseEau + miseEau <= 6 && slot.observateurs + observateurs <= 2);
  if (!compatible.length) return "unavailable";
  return compatible.some((slot) => slot.miseEau === 0 && slot.observateurs === 0) ? "available" : "limited";
}

export function pecheDayStatus(slots: PecheSlot[], participants: number, privatisation: boolean, fullDay: boolean): SalonCalendarStatus {
  const compatible = (slot: PecheSlot) => slot.boatAvailable && (privatisation ? slot.used === 0 : slot.used + participants <= 4);
  if (fullDay) {
    if (!slots.every(compatible)) return "unavailable";
    return slots.some((slot) => slot.used > 0) ? "limited" : "available";
  }
  const possible = slots.filter(compatible);
  if (!possible.length) return "unavailable";
  return possible.some((slot) => slot.used === 0) ? "available" : "limited";
}

export function charterDayStatus(date: string, rows: CharterSlot[], validUntil: string, now: number): SalonCalendarStatus {
  const endDate = addDays(date, 1);
  const requiredSlots = [date, endDate].flatMap((requiredDate) => ["morning", "afternoon"].map((slot) => ({ date: requiredDate, slot })));
  if (endDate > validUntil) return "outside";
  const conflict = rows.some((row) => requiredSlots.some((required) => required.date === row.date && required.slot === row.slot) && row.status !== "available" && !(row.status === "hold" && row.expires_at && new Date(row.expires_at).getTime() <= now));
  return conflict ? "unavailable" : "available";
}

export function monthDates(month: string) {
  const first = `${month}-01`;
  const cursor = new Date(`${first}T00:00:00.000Z`);
  const dates: string[] = [];
  while (cursor.toISOString().slice(0, 7) === month) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return { dates, first, last: dates.at(-1) || first, charterLast: addDays(dates.at(-1) || first, 1) };
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
