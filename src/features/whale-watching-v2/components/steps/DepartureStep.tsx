"use client";

import { DepartureTime } from "../../types/booking";
import { DEPARTURES } from "../../data/departures";

type Props = {
  selected: DepartureTime | null;
  selectedDate: string | null;
  onSelect(time: DepartureTime): void;
};

export function DepartureStep({
  selected,
  selectedDate,
  onSelect,
}: Props) {
  if (!selectedDate) {
    return (
      <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-8">
        <h2 className="text-2xl font-black text-slate-900">
          📅 Choisissez une date
        </h2>

        <p className="mt-3 text-slate-600">
          Sélectionnez une date avant de choisir votre départ.
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
    <div className="space-y-8">

      <div>

        <h2 className="text-3xl font-black text-slate-900">
          🕖 Choisissez votre départ
        </h2>

        <p className="mt-2 text-slate-500">
          {selectedDate}
        </p>

      </div>

      <div className="space-y-5">

        {departures.map((departure) => {

          const full =
            departure.waterRemaining === 0 &&
            departure.observerRemaining === 0;

          return (

            <button
              key={departure.time}
              type="button"
              disabled={full}
              onClick={() => onSelect(departure.time)}
              className={`w-full rounded-[28px] border p-8 text-left transition-all duration-300

              ${
                full
                  ? "cursor-not-allowed border-red-200 bg-red-50 opacity-60"
                  : selected === departure.time
                  ? "border-cyan-500 bg-cyan-50 shadow-xl scale-[1.02]"
                  : "border-slate-200 bg-white shadow-md hover:-translate-y-1 hover:shadow-xl"
              }`}
            >

              <div className="flex items-center justify-between">

                <div>

                  <div className="text-4xl font-black text-slate-900">
                    {departure.time}
                  </div>

                  <div className="mt-4 flex gap-6 text-base">

                    <span className="font-semibold text-slate-700">
                      🥽 {departure.waterRemaining} places
                    </span>

                    <span className="font-semibold text-slate-700">
                      🔭 {departure.observerRemaining} places
                    </span>

                  </div>

                </div>

                <div
                  className={`h-5 w-5 rounded-full ${
                    full
                      ? "bg-red-500"
                      : departure.waterRemaining <= 2
                      ? "bg-orange-400"
                      : "bg-emerald-400"
                  }`}
                />

              </div>

            </button>

          );

        })}

      </div>

    </div>
  );
}