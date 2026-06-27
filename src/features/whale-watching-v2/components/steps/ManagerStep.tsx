"use client";

import { BookingManager } from "../../types/booking";

type Props = {
  manager: BookingManager;
  onChange(manager: BookingManager): void;
};

export function ManagerStep({ manager, onChange }: Props) {
  function update<K extends keyof BookingManager>(
    key: K,
    value: BookingManager[K]
  ) {
    onChange({
      ...manager,
      [key]: value,
    });
  }

  const inputClass =
    "rounded-2xl border border-slate-200 bg-white px-4 py-4 font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-slate-900">
          👤 Responsable de la réservation
        </h2>

        <p className="mt-2 text-slate-600">
          Cette personne recevra la confirmation de réservation.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <input
          className={inputClass}
          placeholder="Prénom"
          value={manager.firstName}
          onChange={(e) => update("firstName", e.target.value)}
        />

        <input
          className={inputClass}
          placeholder="Nom"
          value={manager.lastName}
          onChange={(e) => update("lastName", e.target.value)}
        />

        <input
          className={inputClass}
          placeholder="Téléphone"
          value={manager.phone}
          onChange={(e) => update("phone", e.target.value)}
        />

        <input
          type="email"
          className={inputClass}
          placeholder="Email"
          value={manager.email}
          onChange={(e) => update("email", e.target.value)}
        />
      </div>
    </div>
  );
}