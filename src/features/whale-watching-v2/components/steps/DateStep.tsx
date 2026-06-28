"use client";

import { SEASON } from "../../data/constants";
import { CalendarGrid } from "../calendar/CalendarGrid";

type Props = {
  selectedDate: string | null;
  onSelect(date: string): void;
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function formatSelectedDate(date: string) {
  return dateFormatter.format(new Date(`${date}T12:00:00`));
}

export function DateStep({
  selectedDate,
  onSelect,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="rounded-[30px] border border-cyan-100 bg-gradient-to-br from-white via-cyan-50 to-sky-50 p-5 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-700">
          Date de sortie
        </p>

        <h2 className="mt-2 text-3xl font-black leading-tight text-slate-950">
          Choisissez votre date
        </h2>

        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
          Saison autorisee du {SEASON.start} au {SEASON.end}.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-cyan-100 bg-white p-4">
            <p className="text-2xl font-black text-slate-950">6</p>
            <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
              🤿 nageurs max
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-4">
            <p className="text-2xl font-black text-slate-950">2</p>
            <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
              Observateurs max
            </p>
          </div>
        </div>
      </div>

      <CalendarGrid
        selectedDate={selectedDate}
        onSelect={onSelect}
      />

      {selectedDate && (
        <div className="rounded-[26px] border border-cyan-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700">
            Date selectionnee
          </p>

          <p className="mt-2 text-lg font-black capitalize text-slate-950">
            {formatSelectedDate(selectedDate)}
          </p>
        </div>
      )}
    </div>
  );
}
