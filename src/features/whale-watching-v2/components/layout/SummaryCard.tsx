"use client";

import type {
  BookingState,
  Participant,
} from "../../types/booking";
import { formatDateFr, formatXpf } from "../../utils/format";
import {
  countAdultObservers,
  countChildObservers,
  countWaterParticipants,
} from "../../utils/pricing";

type Props = {
  booking: BookingState;
  total: number;
};

type BookingPaymentFields = BookingState & {
  acompte?: number;
  deposit?: number;
  paidAmount?: number;
  amountPaid?: number;
};

const typeLabels: Record<Participant["type"], string> = {
  water: "Nageur",
  adult_observer: "Observateur adulte",
  child_observer: "Observateur enfant",
};

function getDepositAmount(booking: BookingState) {
  const payment = booking as BookingPaymentFields;
  const value =
    payment.acompte ??
    payment.deposit ??
    payment.paidAmount ??
    payment.amountPaid;

  return typeof value === "number" && value > 0 ? value : 0;
}

function getParticipantName(participant: Participant, index: number) {
  const name = `${participant.firstName} ${participant.lastName}`.trim();

  return name || `Participant ${index + 1}`;
}

function getGearLabel(participant: Participant) {
  if (participant.type !== "water") return "A bord";
  if (participant.hasOwnGear) return "Materiel personnel";

  const wetsuit = participant.wetsuitSize ?? "combinaison";
  const fins = participant.finsSize ?? "palmes";

  return `${wetsuit} / ${fins}`;
}

export function SummaryCard({ booking, total }: Props) {
  const water = countWaterParticipants(booking.participants);
  const adults = countAdultObservers(booking.participants);
  const children = countChildObservers(booking.participants);
  const observers = adults + children;
  const deposit = getDepositAmount(booking);
  const balance = Math.max(total - deposit, 0);

  return (
    <aside className="sticky top-6 overflow-hidden rounded-[34px] border border-white/70 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
      <div className="bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.3),transparent_36%),linear-gradient(135deg,#020617,#0f172a_62%,#083344)] p-5 text-white sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/80">
          Recapitulatif
        </p>

        <h2 className="mt-2 text-3xl font-black leading-tight">
          Votre sortie
        </h2>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/70">
              Nageurs
            </p>

            <p className="mt-2 text-3xl font-black">
              {water}
              <span className="text-base font-bold text-cyan-100/70"> / 6</span>
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/70">
              Observateurs
            </p>

            <p className="mt-2 text-3xl font-black">
              {observers}
              <span className="text-base font-bold text-cyan-100/70"> / 2</span>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 bg-slate-50 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
              Date
            </p>

            <p className="mt-2 text-base font-black leading-snug text-slate-950">
              {booking.selectedDate
                ? formatDateFr(booking.selectedDate)
                : "A choisir"}
            </p>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
              Heure de depart
            </p>

            <p className="mt-2 text-3xl font-black leading-none text-slate-950">
              {booking.departureTime ?? "--:--"}
            </p>
          </section>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
              Participants
            </p>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
              {booking.participants.length}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {booking.participants.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                Aucun participant ajoute.
              </div>
            )}

            {booking.participants.map((participant, index) => (
              <div
                key={participant.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">
                      {getParticipantName(participant, index)}
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {typeLabels[participant.type]}
                    </p>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-cyan-700">
                    {participant.age || "Age"}
                  </span>
                </div>

                <p className="mt-3 text-xs font-semibold text-slate-600">
                  {getGearLabel(participant)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-bold text-slate-500">Total</span>
            <strong className="text-xl font-black text-slate-950">
              {formatXpf(total)}
            </strong>
          </div>

          {deposit > 0 && (
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-emerald-50 px-4 py-3">
              <span className="text-sm font-bold text-emerald-700">
                Acompte
              </span>
              <strong className="font-black text-emerald-700">
                {formatXpf(deposit)}
              </strong>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-950 px-4 py-4 text-white">
            <span className="text-sm font-bold text-cyan-100/80">
              Solde a payer
            </span>
            <strong className="text-2xl font-black">
              {formatXpf(balance)}
            </strong>
          </div>
        </section>

        <button
          type="button"
          className="w-full rounded-[24px] bg-gradient-to-r from-cyan-400 to-sky-500 px-5 py-5 text-base font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_18px_40px_rgba(14,165,233,0.26)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(14,165,233,0.34)]"
        >
          Continuer vers le paiement
        </button>
      </div>
    </aside>
  );
}
