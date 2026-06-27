"use client";

import { Participant } from "../../types/booking";
import { createParticipant } from "../../utils/ParticipantFactory";
import {
  getRemainingObserverPlaces,
  getRemainingWaterPlaces,
} from "../../utils/availability";
import {
  countObservers,
  countWaterParticipants,
} from "../../utils/pricing";
import { ParticipantCard } from "../participants/ParticipantCard";

type Props = {
  participants: Participant[];
  onChange(participants: Participant[]): void;
};

export function ParticipantsStep({
  participants,
  onChange,
}: Props) {
  const waterCount = countWaterParticipants(participants);
  const observerCount = countObservers(participants);
  const waterRemaining = getRemainingWaterPlaces(participants);
  const observerRemaining = getRemainingObserverPlaces(participants);
  const canAddParticipant = waterRemaining > 0 || observerRemaining > 0;

  function addParticipant() {
    if (!canAddParticipant) return;

    const participant = createParticipant();

    onChange([
      ...participants,
      waterRemaining > 0
        ? participant
        : {
            ...participant,
            type: "adult_observer",
          },
    ]);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
          Equipage
        </p>

        <h2 className="mt-2 text-3xl font-black leading-tight text-slate-950">
          Participants
        </h2>

        <p className="mt-2 text-base font-medium leading-relaxed text-slate-600">
          Ajoutez chaque personne presente a bord.
        </p>
      </div>

      <div className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.28),transparent_34%),linear-gradient(135deg,#020617,#0f172a_62%,#083344)] p-5 text-white sm:p-7">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-100/80">
                Capacite
              </p>

              <p className="mt-2 text-4xl font-black leading-none">
                {participants.length}
                <span className="text-lg font-bold text-cyan-100/70"> / 8</span>
              </p>
            </div>

            <button
              type="button"
              onClick={addParticipant}
              disabled={!canAddParticipant}
              className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_16px_36px_rgba(34,211,238,0.28)] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none"
            >
              Ajouter
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/70">
                Nageurs
              </p>

              <p className="mt-2 text-2xl font-black">
                {waterCount}
                <span className="text-sm font-bold text-cyan-100/70"> / 6</span>
              </p>

              <div className="mt-3 h-1.5 rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-cyan-300"
                  style={{ width: `${(waterCount / 6) * 100}%` }}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/70">
                Observateurs
              </p>

              <p className="mt-2 text-2xl font-black">
                {observerCount}
                <span className="text-sm font-bold text-cyan-100/70"> / 2</span>
              </p>

              <div className="mt-3 h-1.5 rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-emerald-300"
                  style={{ width: `${(observerCount / 2) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-slate-50 p-4 sm:p-6">
          {participants.length === 0 && (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-6 text-center">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">
                Aucun participant
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-600">
                Commencez par ajouter une personne.
              </p>
            </div>
          )}

          {participants.map((participant, index) => (
            <ParticipantCard
              key={participant.id}
              participant={participant}
              participants={participants}
              index={index}
              onChange={(updated) => {
                onChange(
                  participants.map((current) =>
                    current.id === updated.id ? updated : current
                  )
                );
              }}
              onDelete={() =>
                onChange(
                  participants.filter(
                    (current) => current.id !== participant.id
                  )
                )
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
