"use client";

import { DEPARTURES } from "../../data/departures";
import type { DepartureTime } from "../../types/booking";

type Props = {
  selected: DepartureTime | null;
  selectedDate: string | null;
  onSelect(time: DepartureTime): void;
};

const DEPARTURE_META: Record<
  DepartureTime,
  {
    title: string;
    period: string;
    tone: string;
    glow: string;
  }
> = {
  "07:00": {
    title: "Depart matin",
    period: "Lumiere douce",
    tone: "from-cyan-400 via-sky-500 to-blue-600",
    glow: "shadow-[0_24px_60px_rgba(14,165,233,0.26)]",
  },
  "13:15": {
    title: "Depart apres-midi",
    period: "Ocean lumineux",
    tone: "from-teal-400 via-cyan-500 to-slate-700",
    glow: "shadow-[0_24px_60px_rgba(20,184,166,0.24)]",
  },
};

function getStatus(waterRemaining: number, observerRemaining: number) {
  if (waterRemaining === 0 && observerRemaining === 0) {
    return {
      label: "Complet",
      dot: "bg-rose-500",
      text: "text-rose-600",
    };
  }

  if (waterRemaining <= 2 || observerRemaining <= 1) {
    return {
      label: "Dernieres places",
      dot: "bg-amber-400",
      text: "text-amber-600",
    };
  }

  return {
    label: "Disponible",
    dot: "bg-emerald-400",
    text: "text-emerald-600",
  };
}

export function DepartureStep({
  selected,
  selectedDate,
  onSelect,
}: Props) {
  if (!selectedDate) {
    return (
      <div className="rounded-[30px] border border-amber-200 bg-amber-50 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">
          Date requise
        </p>

        <h2 className="mt-3 text-2xl font-black text-slate-950">
          Choisissez une date
        </h2>

        <p className="mt-3 text-base font-medium leading-relaxed text-slate-600">
          Selectionnez une date avant de choisir votre depart.
        </p>
      </div>
    );
  }

  const departures =
    DEPARTURES[selectedDate] ?? [
      {
        time: "07:00",
        waterRemaining: 6,
        observerRemaining: 2,
      },
      {
        time: "13:15",
        waterRemaining: 6,
        observerRemaining: 2,
      },
    ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
          Creneau de sortie
        </p>

        <h2 className="mt-2 text-3xl font-black leading-tight text-slate-950">
          Choisissez votre depart
        </h2>

        <p className="mt-2 text-sm font-semibold text-slate-500">
          {selectedDate}
        </p>
      </div>

      <div className="grid gap-4 sm:gap-5">
        {departures.map((departure) => {
          const full =
            departure.waterRemaining === 0 &&
            departure.observerRemaining === 0;
          const active = selected === departure.time;
          const meta = DEPARTURE_META[departure.time];
          const status = getStatus(
            departure.waterRemaining,
            departure.observerRemaining
          );

          return (
            <button
              key={departure.time}
              type="button"
              disabled={full}
              onClick={() => onSelect(departure.time)}
              aria-pressed={active}
              className={`relative min-h-[174px] w-full overflow-hidden rounded-[34px] border p-5 text-left transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-white sm:min-h-[190px] sm:p-7 ${
                full
                  ? "cursor-not-allowed border-rose-100 bg-slate-100 text-slate-400 opacity-70"
                  : active
                  ? `scale-[1.01] border-cyan-300 bg-slate-950 text-white ring-2 ring-cyan-300 ${meta.glow}`
                  : "border-slate-200 bg-white text-slate-950 shadow-sm hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-xl"
              }`}
            >
              <div
                className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${meta.tone}`}
              />

              {!full && (
                <div
                  className={`pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-gradient-to-br ${meta.tone} opacity-20 blur-2xl`}
                />
              )}

              <div className="relative flex h-full flex-col justify-between gap-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p
                      className={`text-[11px] font-black uppercase tracking-[0.18em] ${
                        active ? "text-cyan-100/80" : "text-slate-500"
                      }`}
                    >
                      {meta.title}
                    </p>

                    <div className="mt-2 flex items-end gap-3">
                      <span className="text-5xl font-black leading-none tracking-normal sm:text-6xl">
                        {departure.time}
                      </span>

                      <span
                        className={`mb-1 hidden rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] sm:inline-flex ${
                          active
                            ? "bg-white/10 text-cyan-50"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {meta.period}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
                      active
                        ? "border-white/15 bg-white/10"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <span
                      className={`h-3 w-3 rounded-full ${
                        full ? "bg-rose-500" : active ? "bg-cyan-300" : status.dot
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`rounded-3xl p-4 ${
                      active
                        ? "bg-white/10 text-white"
                        : "bg-slate-50 text-slate-950"
                    }`}
                  >
                    <p
                      className={`text-[11px] font-black uppercase tracking-[0.14em] ${
                        active ? "text-cyan-50/70" : "text-slate-500"
                      }`}
                    >
                      Nage
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      {departure.waterRemaining}
                      <span className="text-sm font-bold opacity-60"> / 6</span>
                    </p>
                  </div>

                  <div
                    className={`rounded-3xl p-4 ${
                      active
                        ? "bg-white/10 text-white"
                        : "bg-slate-50 text-slate-950"
                    }`}
                  >
                    <p
                      className={`text-[11px] font-black uppercase tracking-[0.14em] ${
                        active ? "text-cyan-50/70" : "text-slate-500"
                      }`}
                    >
                      Bord
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      {departure.observerRemaining}
                      <span className="text-sm font-bold opacity-60"> / 2</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`text-xs font-black uppercase tracking-[0.16em] ${
                      active ? "text-cyan-100" : status.text
                    }`}
                  >
                    {status.label}
                  </span>

                  {active && (
                    <span className="rounded-full bg-cyan-300 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-950">
                      Selectionne
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
