"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BoatActivity,
  BoatCalendarSlot,
  BoatSlot,
} from "@/lib/boat-calendar";
import { AdminBoatDay } from "./AdminBoatDay";
import { AdminBoatSidebar } from "./AdminBoatSidebar";
import { AdminBoatStats } from "./AdminBoatStats";

type CalendarCell = {
  date: string;
  dayNumber: number;
  inMonth: boolean;
  slots: Partial<Record<BoatSlot, BoatCalendarSlot>>;
};

const monthNames = [
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Aout",
  "Septembre",
  "Octobre",
  "Novembre",
  "Decembre",
];

const weekDays = ["L", "M", "M", "J", "V", "S", "D"];

function formatDate(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}`;
}

function getMonthBounds(monthDate: Date) {
  const year = monthDate.getUTCFullYear();
  const monthIndex = monthDate.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));

  return {
    year,
    monthIndex,
    from: formatDate(year, monthIndex, 1),
    to: formatDate(year, monthIndex, lastDay.getUTCDate()),
    firstWeekOffset: (firstDay.getUTCDay() + 6) % 7,
    daysInMonth: lastDay.getUTCDate(),
  };
}

function activityLabel(activity: BoatActivity | null) {
  if (activity === "baleines") return "Baleines";
  if (activity === "peche") return "Peche";
  if (activity === "peche_nuit") return "Peche de nuit";
  return "Disponible";
}

export function AdminBoatCalendar() {
  const [monthDate, setMonthDate] = useState(
    () => new Date(Date.UTC(2026, 6, 1))
  );
  const [slots, setSlots] = useState<BoatCalendarSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<BoatSlot | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const bounds = useMemo(() => getMonthBounds(monthDate), [monthDate]);
  const slotMap = useMemo(() => {
    const map = new Map<string, Partial<Record<BoatSlot, BoatCalendarSlot>>>();

    for (const calendarSlot of slots) {
      const current = map.get(calendarSlot.date) || {};
      current[calendarSlot.slot] = calendarSlot;
      map.set(calendarSlot.date, current);
    }

    return map;
  }, [slots]);

  const selectedSlots = selectedDate ? slotMap.get(selectedDate) || {} : {};

  const cells = useMemo(() => {
    const monthCells: CalendarCell[] = [];

    for (let i = 0; i < bounds.firstWeekOffset; i++) {
      monthCells.push({
        date: "",
        dayNumber: 0,
        inMonth: false,
        slots: {},
      });
    }

    for (let day = 1; day <= bounds.daysInMonth; day++) {
      const date = formatDate(bounds.year, bounds.monthIndex, day);
      monthCells.push({
        date,
        dayNumber: day,
        inMonth: true,
        slots: slotMap.get(date) || {},
      });
    }

    while (monthCells.length % 7 !== 0) {
      monthCells.push({
        date: "",
        dayNumber: 0,
        inMonth: false,
        slots: {},
      });
    }

    return monthCells;
  }, [bounds, slotMap]);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/bateau/calendar?from=${bounds.from}&to=${bounds.to}`
      );
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Impossible de charger le planning.");
        setSlots([]);
        return;
      }

      setSlots(payload.slots || []);
    } catch {
      setError("Impossible de charger le planning.");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [bounds.from, bounds.to]);

  useEffect(() => {
    void Promise.resolve().then(loadCalendar);
  }, [loadCalendar]);

  async function runAdminAction(
    endpoint: string,
    slot: BoatSlot,
    successMessage: string
  ) {
    if (!selectedDate) return;

    setActionLoading(slot);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, slot }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || "Action impossible.");
        return;
      }

      setSuccess(successMessage);
      await loadCalendar();
    } catch {
      setError("Action impossible pour le moment.");
    } finally {
      setActionLoading(null);
    }
  }

  function goToPreviousMonth() {
    setSelectedDate(null);
    setSuccess("");
    setMonthDate(
      (current) =>
        new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 1, 1))
    );
  }

  function goToNextMonth() {
    setSelectedDate(null);
    setSuccess("");
    setMonthDate(
      (current) =>
        new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1))
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-cyan-50 to-white px-3 py-4 text-slate-950 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[30px] border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
            Tahiti Trip Fishing
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-black leading-tight md:text-5xl">
                Admin bateau
              </h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                Planning commun par creneaux matin et apres-midi.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-cyan-50 p-2">
              <button
                type="button"
                onClick={goToPreviousMonth}
                className="min-h-12 min-w-12 rounded-xl bg-white text-xl font-black text-cyan-900"
                aria-label="Mois precedent"
              >
                &lt;
              </button>
              <p className="min-w-40 text-center text-base font-black text-cyan-950">
                {monthNames[bounds.monthIndex]} {bounds.year}
              </p>
              <button
                type="button"
                onClick={goToNextMonth}
                className="min-h-12 min-w-12 rounded-xl bg-white text-xl font-black text-cyan-900"
                aria-label="Mois suivant"
              >
                &gt;
              </button>
            </div>
          </div>
        </header>

        <AdminBoatStats cells={cells} daysInMonth={bounds.daysInMonth} />

        {error && (
          <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {success}
          </p>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_420px]">
          <section className="rounded-[30px] border border-cyan-100 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-5">
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-xs font-black uppercase text-cyan-700"
                >
                  {day}
                </div>
              ))}

              {cells.map((cell, index) => (
                <AdminBoatDay
                  key={`${cell.date || "empty"}-${index}`}
                  cell={cell}
                  selected={cell.date === selectedDate}
                  onSelect={setSelectedDate}
                />
              ))}
            </div>

            {loading && (
              <p className="mt-4 text-center text-sm font-bold text-cyan-700">
                Chargement du planning...
              </p>
            )}
          </section>

          <AdminBoatSidebar
            selectedDate={selectedDate}
            slots={selectedSlots}
            activityLabel={activityLabel}
            actionLoading={actionLoading}
            onBlock={(slot) =>
              runAdminAction(
                "/api/admin/bateau/block",
                slot,
                "Creneau bateau bloque."
              )
            }
            onUnblock={(slot) =>
              runAdminAction(
                "/api/admin/bateau/unblock",
                slot,
                "Creneau bateau debloque."
              )
            }
            onClose={() => setSelectedDate(null)}
          />
        </div>
      </div>
    </main>
  );
}

export type { CalendarCell };
