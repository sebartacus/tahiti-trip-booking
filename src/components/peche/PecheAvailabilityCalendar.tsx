"use client";

import { useEffect, useMemo, useState } from "react";
import type { BoatSlotName } from "./constants";

type BoatSlotStatus = "available" | "hold" | "reserved" | "blocked";

type BoatCalendarSlot = {
  date: string;
  slot: BoatSlotName;
  status: BoatSlotStatus;
};

type DayStatus = "available" | "partial" | "unavailable" | "past";

type PecheAvailabilityCalendarProps = {
  selectedDate: string;
  onDateSelect: (date: string) => void;
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

function isSlotUnavailable(slot: BoatCalendarSlot | undefined) {
  return Boolean(slot && slot.status !== "available");
}

function getDayStatus(
  date: string,
  slots: Partial<Record<BoatSlotName, BoatCalendarSlot>>,
  minDate: string
): DayStatus {
  if (date < minDate) return "past";

  const morningUnavailable = isSlotUnavailable(slots.morning);
  const afternoonUnavailable = isSlotUnavailable(slots.afternoon);

  if (morningUnavailable && afternoonUnavailable) return "unavailable";
  if (morningUnavailable || afternoonUnavailable) return "partial";
  return "available";
}

function dayClasses(status: DayStatus, selected: boolean) {
  if (selected) {
    return "border-cyan-800 bg-cyan-700 text-white shadow-[0_12px_24px_rgba(8,145,178,0.24)]";
  }

  if (status === "past") {
    return "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300";
  }

  if (status === "unavailable") {
    return "cursor-not-allowed border-rose-100 bg-rose-50 text-rose-300";
  }

  if (status === "partial") {
    return "border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-400";
  }

  return "border-cyan-100 bg-white text-slate-950 hover:border-cyan-400";
}

export function PecheAvailabilityCalendar({
  selectedDate,
  onDateSelect,
}: PecheAvailabilityCalendarProps) {
  const [monthDate, setMonthDate] = useState(() => {
    const base = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [slots, setSlots] = useState<BoatCalendarSlot[]>([]);
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
        minDate
      );

      return {
        day,
        value,
        status,
        disabled: status === "past" || status === "unavailable",
      };
    });
  }, [bounds, minDate, slotsByDate]);

  useEffect(() => {
    async function loadMonth() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/bateau/calendar?from=${bounds.from}&to=${bounds.to}`
        );
        const payload = await response.json();

        if (!response.ok) {
          setSlots([]);
          setError(payload.error || "Disponibilités indisponibles.");
          return;
        }

        setSlots(Array.isArray(payload.slots) ? payload.slots : []);
      } catch {
        setSlots([]);
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
        <LegendDot className="bg-rose-50 ring-rose-200" label="Indisponible" />
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
