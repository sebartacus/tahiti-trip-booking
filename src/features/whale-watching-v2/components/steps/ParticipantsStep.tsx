"use client";

import { Participant } from "../../types/booking";
import { ParticipantCard } from "../participants/ParticipantCard";
import { createParticipant } from "../../utils/ParticipantFactory";

type Props = {
  participants: Participant[];
  onChange(participants: Participant[]): void;
};

export function ParticipantsStep({
  participants,
  onChange,
}: Props) {
  function addParticipant() {
    onChange([
      ...participants,
      createParticipant(),
    ]);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-slate-900">
          🐋 Participants
        </h2>

        <p className="mt-2 text-slate-600">
          Ajoutez les personnes présentes à bord.
        </p>
      </div>

      <div className="rounded-[28px] bg-cyan-50 p-6 ring-1 ring-cyan-100">
        <div className="text-center">
          <div className="text-5xl">🐋</div>

          <p className="mt-4 text-xl font-black text-slate-900">
            {participants.length} participant(s)
          </p>

          <button
            type="button"
            onClick={addParticipant}
            className="mt-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 px-8 py-4 font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            + Ajouter un participant
          </button>
        </div>

        <div className="mt-8 space-y-5">
          {participants.map((participant, index) => (
            <ParticipantCard
              key={participant.id}
              participant={participant}
              participants={participants}
              index={index}
              onChange={(updated) => {
                onChange(
                  participants.map((p) =>
                    p.id === updated.id ? updated : p
                  )
                );
              }}
              onDelete={() =>
                onChange(
                  participants.filter(
                    (p) => p.id !== participant.id
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