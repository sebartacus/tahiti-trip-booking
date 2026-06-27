"use client";

import { useState } from "react";
import { CalendarDay } from "./CalendarDay";
import { CALENDAR } from "../../data/calendar";
import {
  MONTHS,
  daysInMonth,
  firstDay,
} from "../../utils/calendar";

type Props = {
  selectedDate: string | null;
  onSelect(date: string): void;
};

const WEEK_DAYS = ["L", "M", "M", "J", "V", "S", "D"];

export function CalendarGrid({
  selectedDate,
  onSelect,
}: Props) {
  const [monthIndex, setMonthIndex] = useState(0);

  const month = MONTHS[monthIndex];
  const totalDays = daysInMonth(month.month, month.year);
  const offset = firstDay(month.month, month.year);

  const days = Array.from(
    { length: totalDays },
    (_, i) => i + 1
  );

  return (
    <div className="space-y-6 rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={monthIndex === 0}
          onClick={() => setMonthIndex((m) => m - 1)}
          className="rounded-full bg-slate-100 px-4 py-2 font-bold text-slate-700 disabled:opacity-30"
        >
          ←
        </button>

        <h3 className="text-xl font-black text-slate-900">
          {month.name}
        </h3>

        <button
          type="button"
          disabled={monthIndex === MONTHS.length - 1}
          onClick={() => setMonthIndex((m) => m + 1)}
          className="rounded-full bg-slate-100 px-4 py-2 font-bold text-slate-700 disabled:opacity-30"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-3">
        {WEEK_DAYS.map((d, index) => (
          <div
            key={`${d}-${index}`}
            className="py-2 text-center text-sm font-bold uppercase tracking-wide text-slate-500"
          >
            {d}
          </div>
        ))}

        {Array.from({ length: offset }).map((_, i) => (
          <div key={`offset-${i}`} />
        ))}

        {days.map((day) => {
          const value = `${month.year}-${String(month.month).padStart(
            2,
            "0"
          )}-${String(day).padStart(2, "0")}`;

          const info = CALENDAR.find((d) => d.date === value);

          const disabled =
            (month.month === 7 && day < 20) ||
            (month.month === 11 && day > 20);

          return (
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
          );
        })}
      </div>
    </div>
  );
}