"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  MAX_MISE_EAU,
  MAX_OBSERVATEURS,
  SAISON_DEBUT,
  SAISON_FIN,
} from "../lib/rules";
import type { Depart } from "../lib/types";

type BoatSlotStatus = "available" | "hold" | "reserved" | "blocked";
type BoatSlotName = "morning" | "afternoon";
type BoatCalendarSlot = {
  date: string;
  slot: BoatSlotName;
  status: BoatSlotStatus;
  activity: "baleines" | "peche" | "peche_nuit" | null;
};
type DayStatus = "available" | "partial" | "full" | "past";
type Capacities = Record<Depart, { miseEau: number; observateurs: number }>;

type BaleinesAvailabilityCalendarProps = {
  selectedDate: string;
  onDateSelect: (date: string) => void;
};

const emptyCapacities: Capacities = {
  "07:00": { miseEau: 0, observateurs: 0 },
  "13:15": { miseEau: 0, observateurs: 0 },
};
const monthFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});
const dayLabels = ["L", "M", "M", "J", "V", "S", "D"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}`;
}

function getMonthBounds(monthDate: Date) {
  const year = monthDate.getFullYear();
  const monthIndex = monthDate.getMonth();
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();

  return {
    year,
    monthIndex,
    from: formatDate(year, monthIndex, 1),
    to: formatDate(year, monthIndex, lastDay),
    lastDay,
    offset: (new Date(year, monthIndex, 1).getDay() + 6) % 7,
  };
}

function countParticipants(participants: unknown) {
  const count = { miseEau: 0, observateurs: 0 };

  if (!Array.isArray(participants)) return count;

  for (const participant of participants) {
    if (
      typeof participant === "object" &&
      participant !== null &&
      "role" in participant
    ) {
      if (participant.role === "mise_eau") count.miseEau++;
      if (participant.role === "observateur") count.observateurs++;
    }
  }

  return count;
}

function bateauDisponiblePourBaleines(slot: BoatCalendarSlot | undefined) {
  if (!slot || slot.status === "available") return true;
  if (slot.status === "blocked") return false;
  return slot.activity === "baleines";
}

function departHasSpace(capacity: Capacities[Depart]) {
  return (
    capacity.miseEau < MAX_MISE_EAU ||
    capacity.observateurs < MAX_OBSERVATEURS
  );
}

function getDayStatus(
  date: string,
  slots: Partial<Record<BoatSlotName, BoatCalendarSlot>>,
  capacities: Capacities,
  minDate: string
): DayStatus {
  if (date < minDate || date < SAISON_DEBUT || date > SAISON_FIN) {
    return "past";
  }

  const morningAvailable =
    bateauDisponiblePourBaleines(slots.morning) &&
    departHasSpace(capacities["07:00"]);
  const afternoonAvailable =
    bateauDisponiblePourBaleines(slots.afternoon) &&
    departHasSpace(capacities["13:15"]);

  if (!morningAvailable && !afternoonAvailable) return "full";

  const hasUnavailableBoatSlot =
    (slots.morning && slots.morning.status !== "available") ||
    (slots.afternoon && slots.afternoon.status !== "available");

  const hasExistingBooking =
    capacities["07:00"].miseEau > 0 ||
    capacities["07:00"].observateurs > 0 ||
    capacities["13:15"].miseEau > 0 ||
    capacities["13:15"].observateurs > 0 ||
    Boolean(hasUnavailableBoatSlot);

  if (!morningAvailable || !afternoonAvailable || hasExistingBooking) {
    return "partial";
  }

  return "available";
}

function dayClasses(status: DayStatus, selected: boolean) {
  if (selected) {
    return "border-cyan-800 bg-cyan-700 text-white shadow-[0_12px_24px_rgba(8,145,178,0.24)]";
  }

  if (status === "past") {
    return "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300";
  }

  if (status === "full") {
    return "cursor-not-allowed border-rose-100 bg-rose-50 text-rose-300";
  }

  if (status === "partial") {
    return "border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-400";
  }

  return "border-cyan-100 bg-white text-slate-950 hover:border-cyan-400";
}

export function BaleinesAvailabilityCalendar({
  selectedDate,
  onDateSelect,
}: BaleinesAvailabilityCalendarProps) {
  const [monthDate, setMonthDate] = useState(() => {
    const base = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [slots, setSlots] = useState<BoatCalendarSlot[]>([]);
  const [capacitiesByDate, setCapacitiesByDate] = useState<
    Map<string, Capacities>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const minDate = todayIso();
  const bounds = useMemo(() => getMonthBounds(monthDate), [monthDate]);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, Partial<Record<BoatSlotName, BoatCalendarSlot>>>();

    for (const calendarSlot of slots) {
      const current = map.get(calendarSlot.date) || {};
      current[calendarSlot.slot] = calendarSlot;
      map.set(calendarSlot.date, current);
    }

    return map;
  }, [slots]);

  const days = useMemo(() => {
    return Array.from({ length: bounds.lastDay }, (_, index) => {
      const day = index + 1;
      const value = formatDate(bounds.year, bounds.monthIndex, day);
      const status = getDayStatus(
        value,
        slotsByDate.get(value) || {},
        capacitiesByDate.get(value) || emptyCapacities,
        minDate
      );

      return {
        day,
        value,
        status,
        disabled: status === "past" || status === "full",
      };
    });
  }, [bounds, capacitiesByDate, minDate, slotsByDate]);

  useEffect(() => {
    async function loadMonth() {
      setLoading(true);
      setError("");

      try {
        const [calendarResponse, reservationsResponse] = await Promise.all([
          fetch(`/api/bateau/calendar?from=${bounds.from}&to=${bounds.to}`),
          supabase
            .from("reservations_baleines")
            .select("date_sortie,depart,participants,statut_paiement")
            .gte("date_sortie", bounds.from)
            .lte("date_sortie", bounds.to)
            .in("statut_paiement", ["pending", "paid", "paye"]),
        ]);

        const calendarPayload = await calendarResponse.json();

        if (!calendarResponse.ok) {
          setSlots([]);
          setError(calendarPayload.error || "Disponibilités indisponibles.");
          return;
        }

        if (reservationsResponse.error) {
          setCapacitiesByDate(new Map());
          setError("Disponibilités indisponibles.");
          return;
        }

        const nextCapacities = new Map<string, Capacities>();

        for (const reservation of reservationsResponse.data || []) {
          if (reservation.depart !== "07:00" && reservation.depart !== "13:15") {
            continue;
          }

          const date = reservation.date_sortie as string;
          const depart = reservation.depart as Depart;
          const current = nextCapacities.get(date) || {
            "07:00": { miseEau: 0, observateurs: 0 },
            "13:15": { miseEau: 0, observateurs: 0 },
          };
          const count = countParticipants(reservation.participants);

          current[depart].miseEau += count.miseEau;
          current[depart].observateurs += count.observateurs;
          nextCapacities.set(date, current);
        }

        setSlots(Array.isArray(calendarPayload.slots) ? calendarPayload.slots : []);
        setCapacitiesByDate(nextCapacities);
      } catch {
        setSlots([]);
        setCapacitiesByDate(new Map());
        setError("Disponibilités indisponibles.");
      } finally {
        setLoading(false);
      }
    }

    loadMonth();
  }, [bounds.from, bounds.to]);

  function changeMonth(offset: number) {
    setMonthDate(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1)
    );
  }

  return (
    <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="min-h-10 rounded-xl border border-cyan-100 bg-white px-4 text-sm font-black text-cyan-900 transition hover:border-cyan-300"
          aria-label="Mois précédent"
        >
          ‹
        </button>
        <p className="text-center text-sm font-black uppercase tracking-[0.12em] text-slate-700">
          {monthFormatter.format(monthDate)}
        </p>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="min-h-10 rounded-xl border border-cyan-100 bg-white px-4 text-sm font-black text-cyan-900 transition hover:border-cyan-300"
          aria-label="Mois suivant"
        >
          ›
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
        {dayLabels.map((label, index) => (
          <div key={`${label}-${index}`}>{label}</div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {Array.from({ length: bounds.offset }, (_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}
        {days.map((day) => (
          <button
            key={day.value}
            type="button"
            disabled={day.disabled}
            onClick={() => onDateSelect(day.value)}
            className={`aspect-square rounded-xl border text-sm font-black transition ${dayClasses(
              day.status,
              selectedDate === day.value
            )}`}
            aria-label={`${day.day} ${monthFormatter.format(monthDate)}`}
          >
            {day.day}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-3">
        <LegendDot className="bg-white ring-cyan-200" label="Disponible" />
        <LegendDot
          className="bg-amber-50 ring-amber-300"
          label="Partiellement disponible"
        />
        <LegendDot className="bg-rose-50 ring-rose-200" label="Complet" />
      </div>

      {(loading || error) && (
        <p className="mt-3 text-sm font-bold text-slate-500">
          {error || "Chargement des disponibilités..."}
        </p>
      )}
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ring-2 ${className}`} />
      <span>{label}</span>
    </div>
  );
}
