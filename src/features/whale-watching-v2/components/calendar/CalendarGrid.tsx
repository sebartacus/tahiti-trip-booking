"use client";

import { useMemo, useState } from "react";
import { CALENDAR } from "../../data/calendar";
import { SEASON } from "../../data/constants";
import {
  MONTHS,
  daysInMonth,
  firstDay,
} from "../../utils/calendar";
import { CalendarDay } from "./CalendarDay";

type Props = {
  selectedDate: string | null;
  onSelect(date: string): void;
};

const WEEK_DAYS = ["L", "M", "M", "J", "V", "S", "D"];

const MONTH_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

function toDateValue(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

function getMonthLabel(year: number, month: number) {
  const label = MONTH_FORMATTER.format(new Date(year, month - 1, 1));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function CalendarGrid({
  selectedDate,
  onSelect,
}: Props) {
  const [monthIndex, setMonthIndex] = useState(0);

  const month = MONTHS[monthIndex];
  const totalDays = daysInMonth(month.month, month.year);
  const offset = firstDay(month.month, month.year);
  const monthLabel = getMonthLabel(month.year, month.month);

  const availabilityByDate = useMemo(
    () => new Map(CALENDAR.map((day) => [day.date, day])),
    []
  );

  const calendarDays = useMemo(
    () =>
      Array.from({ length: totalDays }, (_, index) => {
        const day = index + 1;
        const value = toDateValue(month.year, month.month, day);

        return {
          day,
          value,
          info: availabilityByDate.get(value),
          disabled: value < SEASON.start || value > SEASON.end,
        };
      }),
    [availabilityByDate, month.month, month.year, totalDays]
  );

  return (
    <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-100 bg-gradient-to-br from-white via-sky-50 to-cyan-50 px-4 py-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label="Mois precedent"
            disabled={monthIndex === 0}
            onClick={() => setMonthIndex((current) => current - 1)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-black text-slate-700 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {"<"}
          </button>

          <div className="min-w-0 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-700">
              Calendrier
            </p>

            <h3 className="mt-1 truncate text-2xl font-black leading-tight text-slate-950">
              {monthLabel}
            </h3>
          </div>

          <button
            type="button"
            aria-label="Mois suivant"
            disabled={monthIndex === MONTHS.length - 1}
            onClick={() => setMonthIndex((current) => current + 1)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-black text-slate-700 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {">"}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-cyan-100 bg-white px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              🤿 Nageurs
            </p>
            <p className="mt-1 text-lg font-black text-slate-950">
              6 places max
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Observateurs
            </p>
            <p className="mt-1 text-lg font-black text-slate-950">
              2 places max
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Beaucoup
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            Quelques
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Complet
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            Ferme
          </span>
        </div>
      </div>

      <div className="bg-white p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-y-2">
          {WEEK_DAYS.map((dayName, index) => (
            <div
              key={`${dayName}-${index}`}
              className="flex h-8 items-center justify-center text-[11px] font-black uppercase text-slate-400"
            >
              {dayName}
            </div>
          ))}

          {Array.from({ length: offset }).map((_, index) => (
            <div key={`offset-${index}`} className="h-[54px]" />
          ))}

          {calendarDays.map(({ day, value, info, disabled }) => (
            <CalendarDay
              key={value}
              day={day}
              active={selectedDate === value}
              disabled={disabled}
              status={info?.status}
              waterRemaining={info?.waterRemaining}
              observerRemaining={info?.observerRemaining}
              onClick={() => onSelect(value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
