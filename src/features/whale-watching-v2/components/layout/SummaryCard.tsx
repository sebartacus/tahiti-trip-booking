"use client";

import { BookingState } from "../../types/booking";
import { formatXpf, formatDateFr } from "../../utils/format";
import {
  countAdultObservers,
  countChildObservers,
  countWaterParticipants,
} from "../../utils/pricing";

type Props = {
  booking: BookingState;
  total: number;
};

export function SummaryCard({ booking, total }: Props) {
  const water = countWaterParticipants(booking.participants);
  const adults = countAdultObservers(booking.participants);
  const children = countChildObservers(booking.participants);
  const observers = adults + children;

  return (
    <aside className="sticky top-6 rounded-[32px] bg-white p-8 shadow-xl ring-1 ring-slate-200">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-600">
          Récapitulatif
        </p>

        <h2 className="mt-2 text-3xl font-black text-slate-900">
          Votre sortie
        </h2>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl bg-sky-50 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Date
          </p>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {booking.selectedDate
              ? formatDateFr(booking.selectedDate)
              : "À choisir"}
          </p>
        </div>

        <div className="rounded-2xl bg-cyan-50 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Départ
          </p>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {booking.departureTime ?? "À choisir"}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <div className="flex justify-between">
            <span>🥽 Mise à l'eau</span>
            <strong>{water}</strong>
          </div>

          <div className="mt-3 flex justify-between">
            <span>🔭 Observateurs</span>
            <strong>{adults}</strong>
          </div>

          <div className="mt-3 flex justify-between">
            <span>👦 Enfants</span>
            <strong>{children}</strong>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5">
          <div className="mb-2 flex justify-between text-sm font-semibold">
            <span>🥽 Places utilisées</span>
            <span>{water}/6</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all"
              style={{ width: `${(water / 6) * 100}%` }}
            />
          </div>

          <div className="mt-5 mb-2 flex justify-between text-sm font-semibold">
            <span>🔭 Places observateurs</span>
            <span>{observers}/2</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${(observers / 2) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[28px] bg-gradient-to-br from-cyan-400 to-sky-500 p-6 text-white shadow-lg">
        <p className="text-sm font-bold uppercase tracking-wider">
          Total
        </p>

        <p className="mt-2 text-4xl font-black">
          {formatXpf(total)}
        </p>
      </div>
    </aside>
  );
}