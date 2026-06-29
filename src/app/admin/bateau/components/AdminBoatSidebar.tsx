"use client";

import { useEffect, useState } from "react";
import type {
  BoatActivity,
  BoatCalendarSlot,
  BoatSlot,
} from "@/lib/boat-calendar";

type AdminBoatSidebarProps = {
  selectedDate: string | null;
  slots: Partial<Record<BoatSlot, BoatCalendarSlot>>;
  activityLabel: (activity: BoatActivity | null) => string;
  actionLoading: BoatSlot | null;
  onBlock: (slot: BoatSlot) => void;
  onUnblock: (slot: BoatSlot) => void;
  onClose: () => void;
};

const slotLabels: Record<BoatSlot, string> = {
  morning: "Matin",
  afternoon: "Apres-midi",
};

type ReservationDetails = {
  clientName: string;
  email: string;
  telephone: string;
  payment: string;
};

function formatDisplayDate(date: string | null) {
  if (!date) return "Aucune date";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function statusLabel(slot: BoatCalendarSlot | undefined) {
  if (!slot || slot.status === "available") return "Disponible";
  if (slot.status === "hold") return "En attente paiement";
  if (slot.status === "reserved") return "Reserve";
  if (slot.status === "blocked") return "Bloque manuellement";
  return slot.status;
}

export function AdminBoatSidebar({
  selectedDate,
  slots,
  activityLabel,
  actionLoading,
  onBlock,
  onUnblock,
  onClose,
}: AdminBoatSidebarProps) {
  const visible = Boolean(selectedDate);

  return (
    <aside
      className={[
        "fixed inset-x-0 bottom-0 z-40 max-h-[88vh] overflow-y-auto rounded-t-[30px] border border-cyan-100 bg-white p-5 shadow-[0_-18px_45px_rgba(15,23,42,0.16)] transition lg:static lg:max-h-none lg:rounded-[30px] lg:shadow-[0_18px_45px_rgba(15,23,42,0.06)]",
        visible ? "block" : "hidden lg:block",
      ].join(" ")}
    >
      {!selectedDate ? (
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
            Detail
          </p>
          <h2 className="mt-2 text-2xl font-black">Selectionne une date</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
            Clique sur un jour pour gerer ses creneaux matin et apres-midi.
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
                Detail jour
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {formatDisplayDate(selectedDate)}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-2xl border border-cyan-100 px-4 text-sm font-black text-cyan-900"
            >
              Fermer
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <SlotCard
              slotName="morning"
              slot={slots.morning}
              activityLabel={activityLabel}
              actionLoading={actionLoading}
              onBlock={onBlock}
              onUnblock={onUnblock}
            />
            <SlotCard
              slotName="afternoon"
              slot={slots.afternoon}
              activityLabel={activityLabel}
              actionLoading={actionLoading}
              onBlock={onBlock}
              onUnblock={onUnblock}
            />
          </div>
        </div>
      )}
    </aside>
  );
}

function SlotCard({
  slotName,
  slot,
  activityLabel,
  actionLoading,
  onBlock,
  onUnblock,
}: {
  slotName: BoatSlot;
  slot: BoatCalendarSlot | undefined;
  activityLabel: (activity: BoatActivity | null) => string;
  actionLoading: BoatSlot | null;
  onBlock: (slot: BoatSlot) => void;
  onUnblock: (slot: BoatSlot) => void;
}) {
  const canBlock = !slot || slot.status === "available" || slot.status === "hold";
  const canUnblock = slot?.status === "blocked";
  const loading = actionLoading === slotName;
  const [reservation, setReservation] = useState<ReservationDetails | null>(
    null
  );
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationError, setReservationError] = useState("");

  useEffect(() => {
    async function loadReservation() {
      if (!slot?.reservation_id || !slot.reservation_table) {
        setReservation(null);
        setReservationError("");
        return;
      }

      setReservationLoading(true);
      setReservationError("");

      try {
        const params = new URLSearchParams({
          table: slot.reservation_table,
          id: slot.reservation_id,
        });
        const response = await fetch(
          `/api/admin/bateau/reservation?${params.toString()}`
        );
        const payload = await response.json();

        if (!response.ok) {
          setReservation(null);
          setReservationError(
            payload.error || "Reservation client indisponible."
          );
          return;
        }

        setReservation(payload.reservation || null);
      } catch {
        setReservation(null);
        setReservationError("Reservation client indisponible.");
      } finally {
        setReservationLoading(false);
      }
    }

    void Promise.resolve().then(loadReservation);
  }, [slot?.reservation_id, slot?.reservation_table]);

  return (
    <div className="rounded-[24px] border border-cyan-100 bg-cyan-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-slate-950">
          {slotLabels[slotName]}
        </h3>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase text-cyan-800">
          {statusLabel(slot)}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        <InfoLine label="Activite" value={activityLabel(slot?.activity || null)} />
        <InfoLine
          label="Client"
          value={
            reservationLoading
              ? "Chargement..."
              : reservation?.clientName || "Non disponible"
          }
        />
        <InfoLine
          label="Telephone"
          value={reservation?.telephone || "Non disponible"}
        />
        <InfoLine label="Email" value={reservation?.email || "Non disponible"} />
        <InfoLine
          label="Paiement"
          value={reservation?.payment || "En attente"}
        />
        <InfoLine label="Reservation" value={slot?.reservation_id || "Aucune"} />
      </div>

      {reservationError && (
        <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700">
          {reservationError}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onBlock(slotName)}
          disabled={!canBlock || Boolean(actionLoading)}
          className="min-h-12 rounded-2xl bg-red-600 px-4 text-sm font-black text-white disabled:bg-red-100 disabled:text-red-500 disabled:opacity-70"
        >
          {loading ? "Patiente..." : "Bloquer"}
        </button>
        <button
          type="button"
          onClick={() => onUnblock(slotName)}
          disabled={!canUnblock || Boolean(actionLoading)}
          className="min-h-12 rounded-2xl bg-cyan-900 px-4 text-sm font-black text-white disabled:bg-slate-100 disabled:text-slate-500 disabled:opacity-70"
        >
          {loading ? "Patiente..." : "Debloquer"}
        </button>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-cyan-700">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}
