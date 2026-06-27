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
    <div className="overflow-hidden rounded-[32px] border border-white/70 bg-slate-950 text-white shadow-[0_24px_70px_rgba(15,23,42,0.24)]">
      <div className="bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.35),transparent_38%),linear-gradient(135deg,#020617,#0f172a_58%,#083344)] px-4 pb-5 pt-4 sm:px-6 sm:pt-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label="Mois precedent"
            disabled={monthIndex === 0}
            onClick={() => setMonthIndex((current) => current - 1)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xl font-semibold text-white shadow-inner backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {"<"}
          </button>

          <div className="min-w-0 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-100/80">
              Saison baleines
            </p>

            <h3 className="mt-1 truncate text-2xl font-black leading-tight text-white sm:text-3xl">
              {monthLabel}
            </h3>
          </div>

          <button
            type="button"
            aria-label="Mois suivant"
            disabled={monthIndex === MONTHS.length - 1}
            onClick={() => setMonthIndex((current) => current + 1)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xl font-semibold text-white shadow-inner backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {">"}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-3xl border border-white/10 bg-white/10 p-2 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-50 backdrop-blur">
          <span>6 nageurs max</span>
          <span>2 observateurs max</span>
        </div>
      </div>

      <div className="bg-slate-50 p-3 sm:p-5">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {WEEK_DAYS.map((dayName, index) => (
            <div
              key={`${dayName}-${index}`}
              className="flex aspect-square items-center justify-center text-[11px] font-black uppercase text-slate-400 sm:text-xs"
            >
              {dayName}
            </div>
          ))}

          {Array.from({ length: offset }).map((_, index) => (
            <div key={`offset-${index}`} className="aspect-square" />
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
