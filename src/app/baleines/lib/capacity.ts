import type { Depart } from "./types";

export type DepartCapacities = Record<Depart, { miseEau: number; observateurs: number }>;
export type CapacityRow = {
  date_sortie: string;
  depart: string;
  mise_eau: number | string;
  observateurs: number | string;
};

export function emptyBaleinesCapacities(): DepartCapacities {
  return { "07:00": { miseEau: 0, observateurs: 0 }, "13:15": { miseEau: 0, observateurs: 0 } };
}

export const unavailableBaleinesCapacities: DepartCapacities = {
  "07:00": { miseEau: 6, observateurs: 2 },
  "13:15": { miseEau: 6, observateurs: 2 },
};

// SQL owns the status/source/expiry rule; both public views consume its aggregates.
export function baleinesCapacitiesByDate(rows: CapacityRow[]) {
  const result = new Map<string, DepartCapacities>();
  for (const row of rows) {
    if (row.depart !== "07:00" && row.depart !== "13:15") continue;
    const miseEau = Number(row.mise_eau), observateurs = Number(row.observateurs);
    if (!Number.isSafeInteger(miseEau) || miseEau < 0 ||
        !Number.isSafeInteger(observateurs) || observateurs < 0) {
      throw new Error("Capacites Baleines invalides.");
    }
    const day = result.get(row.date_sortie) || emptyBaleinesCapacities();
    day[row.depart] = { miseEau, observateurs };
    result.set(row.date_sortie, day);
  }
  return result;
}
