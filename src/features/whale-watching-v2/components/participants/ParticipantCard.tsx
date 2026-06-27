"use client";

import { useState } from "react";
import {
  FINS_SIZES,
  WETSUIT_SIZES,
} from "../../data/constants";
import type { Participant } from "../../types/booking";
import {
  countObservers,
  countWaterParticipants,
} from "../../utils/pricing";

type Props = {
  participant: Participant;
  participants: Participant[];
  index?: number;
  onChange(participant: Participant): void;
  onDelete(): void;
};

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";

const selectClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base font-black text-slate-950 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";

export function ParticipantCard({
  participant,
  participants,
  index = 0,
  onChange,
  onDelete,
}: Props) {
  const [isOpen, setIsOpen] = useState(true);

  const waterCount = countWaterParticipants(participants);
  const observerCount = countObservers(participants);
  const canSelectWater =
    participant.type === "water" || waterCount < 6;
  const canSelectObserver =
    participant.type !== "water" || observerCount < 2;

  function update<K extends keyof Participant>(
    key: K,
    value: Participant[K]
  ) {
    onChange({
      ...participant,
      [key]: value,
    });
  }

  function updateType(value: Participant["type"]) {
    if (value === "water" && !canSelectWater) return;
    if (value !== "water" && !canSelectObserver) return;

    onChange({
      ...participant,
      type: value,
    });
  }

  const title =
    participant.firstName || participant.lastName
      ? `${participant.firstName} ${participant.lastName}`.trim()
      : `Participant ${index + 1}`;

  const typeLabel =
    participant.type === "water"
      ? "Nageur"
      : participant.type === "adult_observer"
      ? "Observateur adulte"
      : "Observateur enfant";

  const typeTone =
    participant.type === "water"
      ? "bg-cyan-50 text-cyan-700"
      : "bg-emerald-50 text-emerald-700";

  return (
    <article className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm transition hover:shadow-lg">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left sm:p-5"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-slate-950 text-xl font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.2)]">
            {index + 1}
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-lg font-black leading-tight text-slate-950">
              {title}
            </h3>

            <p
              className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${typeTone}`}
            >
              {typeLabel}
            </p>
          </div>
        </div>

        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl font-black text-slate-700">
          {isOpen ? "-" : "+"}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-5 border-t border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                Prenom
              </span>

              <input
                className={inputClass}
                placeholder="Prenom"
                value={participant.firstName}
                onChange={(event) => update("firstName", event.target.value)}
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                Nom
              </span>

              <input
                className={inputClass}
                placeholder="Nom"
                value={participant.lastName}
                onChange={(event) => update("lastName", event.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                Age
              </span>

              <input
                className={inputClass}
                placeholder="Age"
                value={participant.age}
                onChange={(event) => update("age", event.target.value)}
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                Role a bord
              </span>

              <select
                className={selectClass}
                value={participant.type}
                onChange={(event) =>
                  updateType(event.target.value as Participant["type"])
                }
              >
                <option value="water" disabled={!canSelectWater}>
                  Nageur
                </option>
                <option
                  value="adult_observer"
                  disabled={!canSelectObserver}
                >
                  Observateur adulte
                </option>
                <option
                  value="child_observer"
                  disabled={!canSelectObserver}
                >
                  Observateur enfant
                </option>
              </select>
            </label>
          </div>

          {participant.type === "water" && (
            <div className="space-y-4 rounded-[28px] border border-cyan-100 bg-cyan-50 p-4 sm:p-5">
              <label className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm">
                <span>
                  <span className="block text-sm font-black text-slate-950">
                    Materiel personnel
                  </span>

                  <span className="mt-1 block text-xs font-semibold text-slate-500">
                    Combinaison et palmes non requises si active.
                  </span>
                </span>

                <input
                  type="checkbox"
                  checked={participant.hasOwnGear}
                  onChange={(event) =>
                    update("hasOwnGear", event.target.checked)
                  }
                  className="h-6 w-6 shrink-0 accent-cyan-500"
                />
              </label>

              {!participant.hasOwnGear && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">
                      Combinaison
                    </span>

                    <select
                      className={selectClass}
                      value={participant.wetsuitSize ?? ""}
                      onChange={(event) =>
                        update(
                          "wetsuitSize",
                          event.target.value as Participant["wetsuitSize"]
                        )
                      }
                    >
                      <option value="">Taille</option>

                      {WETSUIT_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">
                      Palmes
                    </span>

                    <select
                      className={selectClass}
                      value={participant.finsSize ?? ""}
                      onChange={(event) =>
                        update(
                          "finsSize",
                          event.target.value as Participant["finsSize"]
                        )
                      }
                    >
                      <option value="">Pointure</option>

                      {FINS_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onDelete}
            className="w-full rounded-2xl border border-rose-100 bg-white px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-rose-600 transition hover:bg-rose-50"
          >
            Supprimer
          </button>
        </div>
      )}
    </article>
  );
}
