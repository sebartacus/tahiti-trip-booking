"use client";

import { useState } from "react";
import { Participant } from "../../types/booking";
import {
  FINS_SIZES,
  WETSUIT_SIZES,
} from "../../data/constants";

type Props = {
  participant: Participant;
  participants: Participant[];
  index?: number;
  onChange(participant: Participant): void;
  onDelete(): void;
};

export function ParticipantCard({
  participant,
  index = 0,
  onChange,
  onDelete,
}: Props) {
  const [isOpen, setIsOpen] = useState(true);

  function update<K extends keyof Participant>(
    key: K,
    value: Participant[K]
  ) {
    onChange({
      ...participant,
      [key]: value,
    });
  }

  const title =
    participant.firstName || participant.lastName
      ? `${participant.firstName} ${participant.lastName}`.trim()
      : `Participant ${index + 1}`;

  const typeLabel =
    participant.type === "water"
      ? "Mise à l'eau"
      : participant.type === "adult_observer"
      ? "Observateur adulte"
      : "Observateur enfant";

  return (
    <div className="overflow-hidden rounded-[28px] bg-white shadow-md ring-1 ring-slate-200 transition-all hover:shadow-xl">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-sky-500 text-xl font-black text-white shadow-md">
            {index + 1}
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-900">
              {title}
            </h3>

            <p className="mt-1 text-sm font-semibold text-cyan-700">
              {typeLabel}
            </p>
          </div>
        </div>

        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-600">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-5 border-t border-slate-200 bg-slate-50 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4 font-semibold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              placeholder="Prénom"
              value={participant.firstName}
              onChange={(e) => update("firstName", e.target.value)}
            />

            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4 font-semibold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              placeholder="Nom"
              value={participant.lastName}
              onChange={(e) => update("lastName", e.target.value)}
            />
          </div>

          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 font-semibold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 sm:w-40"
            placeholder="Âge"
            value={participant.age}
            onChange={(e) => update("age", e.target.value)}
          />

          <select
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 font-semibold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            value={participant.type}
            onChange={(e) =>
              update(
                "type",
                e.target.value as Participant["type"]
              )
            }
          >
            <option value="water">Mise à l'eau</option>
            <option value="adult_observer">Observateur adulte</option>
            <option value="child_observer">Observateur enfant</option>
          </select>

          {participant.type === "water" && (
            <div className="space-y-4 rounded-3xl bg-cyan-50 p-5 ring-1 ring-cyan-100">
              <label className="flex items-center gap-3 font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={participant.hasOwnGear}
                  onChange={(e) =>
                    update("hasOwnGear", e.target.checked)
                  }
                  className="h-5 w-5 accent-cyan-500"
                />

                Je possède mon matériel
              </label>

              {!participant.hasOwnGear && (
                <div className="grid gap-4 md:grid-cols-2">
                  <select
                    className="rounded-2xl border border-cyan-100 bg-white px-4 py-4 font-semibold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                    value={participant.wetsuitSize ?? ""}
                    onChange={(e) =>
                      update(
                        "wetsuitSize",
                        e.target.value as Participant["wetsuitSize"]
                      )
                    }
                  >
                    <option value="">Taille combinaison</option>

                    {WETSUIT_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>

                  <select
                    className="rounded-2xl border border-cyan-100 bg-white px-4 py-4 font-semibold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                    value={participant.finsSize ?? ""}
                    onChange={(e) =>
                      update(
                        "finsSize",
                        e.target.value as Participant["finsSize"]
                      )
                    }
                  >
                    <option value="">Pointure palmes</option>

                    {FINS_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onDelete}
            className="w-full rounded-2xl bg-red-50 px-5 py-4 font-bold text-red-600 transition hover:bg-red-100"
          >
            Supprimer ce participant
          </button>
        </div>
      )}
    </div>
  );
}