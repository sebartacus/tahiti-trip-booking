"use client";

import { SEASON } from "../../data/constants";
import { CalendarGrid } from "../calendar/CalendarGrid";

type Props = {
  selectedDate: string | null;
  onSelect(date: string): void;
};

export function DateStep({
  selectedDate,
  onSelect,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          📅 Choisissez votre date
        </h2>

        <p className="mt-2 text-slate-300">
          Saison autorisée du 20 juillet au 20 novembre 2026.
        </p>
      </div>

      <div className="rounded-2xl border border-cyan-500/20 bg-slate-900 p-6">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Date de la sortie
        </label>

        <CalendarGrid
  selectedDate={selectedDate}
  onSelect={onSelect}
/>
      </div>

      {selectedDate && (
        <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-4">
          <p className="text-cyan-200 font-medium">
            Date sélectionnée :
          </p>

          <p className="mt-1 text-white">
            {selectedDate}
          </p>
        </div>
      )}
    </div>
  );
}