"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import type { CharterFormula } from "@/lib/charter-availability";
import { CHARTER_FORMULA_DETAILS } from "@/lib/charter-pricing";
import { CharterBookingForm } from "./CharterBookingForm";
import { useCharterReservation } from "./CharterReservationNavigation";
import { getTahitiCurrentMonth, getTahitiToday } from "@/lib/tahiti-date";

type MonthDay = { date: string; date_fin: string; available: boolean };
type MonthPayload = { formula: CharterFormula; month: string; days: MonthDay[]; error?: string };

const FORMULAS: CharterFormula[] = ["tetiaroa_2j_1n", "tetiaroa_3j_2n", "moorea_matin", "moorea_journee", "sunset"];
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const ENGLISH_WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function formulaLabel(formula: CharterFormula, en: boolean) {
  if (!en) return CHARTER_FORMULA_DETAILS[formula].label;
  return { tetiaroa_2j_1n: "Tetiaroa 2 days / 1 night", tetiaroa_3j_2n: "Tetiaroa 3 days / 2 nights", moorea_matin: "Moorea 7 AM–1 PM", moorea_journee: "Moorea full day", sunset: "Private Sunset" }[formula];
}

function formulaDetail(formula: CharterFormula, en: boolean) {
  if (!en) return CHARTER_FORMULA_DETAILS[formula].detail;
  return { tetiaroa_2j_1n: "1 night aboard", tetiaroa_3j_2n: "2 nights aboard", moorea_matin: "Morning trip", moorea_journee: "Full-day trip", sunset: "2.5-hour cruise" }[formula];
}

function initialMonth() {
  return getTahitiCurrentMonth();
}

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function dateLabel(value: string, en = false) {
  return new Intl.DateTimeFormat(en ? "en-US" : "fr-FR", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function CharterAvailabilityCalendar({ locale = "fr" }: { locale?: "fr" | "en" }) {
  const { formula, reservationRef, selectFormula } = useCharterReservation();
  return (
    <CharterAvailabilityCalendarForFormula
      key={formula}
      formula={formula}
      reservationRef={reservationRef}
      selectFormula={selectFormula}
      locale={locale}
    />
  );
}

function CharterAvailabilityCalendarForFormula({
  formula,
  reservationRef,
  selectFormula,
  locale,
}: {
  formula: CharterFormula;
  reservationRef: RefObject<HTMLElement | null>;
  selectFormula: (formula: CharterFormula) => void;
  locale: "fr" | "en";
}) {
  const en = locale === "en";
  const [month, setMonth] = useState(initialMonth);
  const [days, setDays] = useState<MonthDay[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingConflict, setBookingConflict] = useState("");
  const today = getTahitiToday();

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/charter/availability/month?formule=${formula}&mois=${month}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as MonthPayload;
        if (!response.ok) throw new Error(en ? "Availability is currently unavailable." : payload.error || "Disponibilités indisponibles.");
        setDays(payload.days);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setDays([]);
        setError(requestError instanceof Error ? requestError.message : en ? "Availability is currently unavailable." : "Disponibilités indisponibles.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [en, formula, month]);

  const selectedDay = days.find((day) => day.date === selectedDate);
  const calendar = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const offset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
    return { offset, label: new Intl.DateTimeFormat(en ? "en-US" : "fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, monthNumber - 1, 1))) };
  }, [en, month]);

  function chooseFormula(nextFormula: CharterFormula) {
    selectFormula(nextFormula);
  }

  function changeMonth(offset: number) {
    setMonth((value) => shiftMonth(value, offset));
    setSelectedDate("");
    setDays([]);
    setError("");
    setBookingConflict("");
    setLoading(true);
  }

  return (
    <section ref={reservationRef} id="reservation-charter" className="scroll-mt-4 bg-[#eef9f8] py-16 md:scroll-mt-6 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">{en ? "Availability" : "Disponibilités"}</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.03em] text-cyan-950 sm:text-5xl">{en ? "Book your charter" : "Réserver votre charter"}</h2>
          <p className="mt-4 font-semibold leading-7 text-slate-700">{en ? "Choose an option, then select an available date." : "Choisissez votre formule puis une date disponible."}</p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {FORMULAS.map((formulaId) => (
            <button key={formulaId} type="button" onClick={() => chooseFormula(formulaId)} aria-pressed={formula === formulaId} className={`min-h-24 rounded-2xl border p-4 text-left transition ${formula === formulaId ? "border-cyan-900 bg-cyan-950 text-white shadow-lg" : "border-cyan-100 bg-white text-cyan-950 hover:border-cyan-400"}`}>
              <span className="block text-sm font-black leading-5">{formulaLabel(formulaId, en)}</span>
              <span className={`mt-2 block text-xs font-bold ${formula === formulaId ? "text-cyan-100" : "text-slate-500"}`}>{formulaDetail(formulaId, en)}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-start">
          <div className="rounded-[2rem] border border-cyan-100 bg-white p-4 shadow-[0_16px_40px_rgba(8,145,178,0.08)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => changeMonth(-1)} disabled={month <= initialMonth()} aria-label={en ? "Previous month" : "Mois précédent"} className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-100 text-xl font-black text-cyan-900 disabled:cursor-not-allowed disabled:opacity-30">‹</button>
              <p className="text-center text-base font-black capitalize text-cyan-950 sm:text-lg">{calendar.label}</p>
              <button type="button" onClick={() => changeMonth(1)} aria-label={en ? "Next month" : "Mois suivant"} className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-100 text-xl font-black text-cyan-900">›</button>
            </div>
            <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[11px] font-black text-slate-500 sm:gap-2">{(en ? ENGLISH_WEEKDAYS : WEEKDAYS).map((day, index) => <span key={`${day}-${index}`} className="py-1">{day}</span>)}</div>
            <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-2">
              {Array.from({ length: calendar.offset }, (_, index) => <span key={`empty-${index}`} />)}
              {days.map((day) => {
                const past = day.date < today;
                const disabled = past || !day.available || loading;
                return <button key={day.date} type="button" disabled={disabled} onClick={() => { setSelectedDate(day.date); setBookingConflict(""); }} aria-label={`${dateLabel(day.date, en)} — ${past ? (en ? "past date" : "date passée") : day.available ? (en ? "available" : "disponible") : (en ? "unavailable" : "indisponible")}`} className={`aspect-square min-w-0 rounded-xl border text-sm font-black transition sm:text-base ${selectedDate === day.date ? "border-cyan-900 bg-cyan-900 text-white ring-2 ring-cyan-200" : past ? "border-transparent bg-slate-50 text-slate-300" : day.available ? "border-teal-200 bg-teal-50 text-teal-900 hover:border-teal-500" : "border-rose-100 bg-rose-50 text-rose-300"}`}>{Number(day.date.slice(-2))}</button>;
              })}
            </div>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-slate-600">
              <Legend color="bg-teal-100 ring-teal-300" label={en ? "Available" : "Disponible"} />
              <Legend color="bg-rose-50 ring-rose-200" label={en ? "Unavailable" : "Indisponible"} />
              <Legend color="bg-slate-100 ring-slate-200" label={en ? "Past date" : "Date passée"} />
            </div>
            {(loading || error) && <p className={`mt-4 text-sm font-bold ${error ? "text-rose-700" : "text-slate-500"}`}>{error || (en ? "Loading availability…" : "Chargement des disponibilités…")}</p>}
            {bookingConflict && <p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-black text-rose-700">{bookingConflict}</p>}
          </div>

          <aside className="rounded-[2rem] bg-cyan-950 p-6 text-white sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">{en ? "Your selection" : "Votre sélection"}</p>
            <h3 className="mt-3 text-2xl font-black">{formulaLabel(formula, en)}</h3>
            {selectedDay ? <div className="mt-6 space-y-3 text-sm font-semibold text-cyan-50"><p><b className="text-white">{en ? "Departure:" : "Départ :"}</b> {dateLabel(selectedDay.date, en)}</p>{formula.startsWith("tetiaroa") && <><p><b className="text-white">{en ? "Return:" : "Retour :"}</b> {dateLabel(selectedDay.date_fin, en)}</p><p>{formulaDetail(formula, en)}</p></>}{formula === "sunset" && <p>{en ? "Departure time adapted to sunset." : "Horaire adapté au coucher du soleil."}</p>}</div> : <p className="mt-5 text-sm font-semibold leading-6 text-cyan-100">{en ? "Select an available date in the calendar to view your summary." : "Sélectionnez une date disponible dans le calendrier pour afficher votre récapitulatif."}</p>}
          </aside>
        </div>
        {selectedDay && <CharterBookingForm key={`${formula}:${selectedDay.date}`} formula={formula} startDate={selectedDay.date} endDate={selectedDay.date_fin} locale={locale} onAvailabilityConflict={() => { setSelectedDate(""); setBookingConflict(en ? "This date has just been booked. Please choose another date." : "Cette date vient d’être réservée. Choisissez une autre date."); setDays([]); setLoading(true); fetch(`/api/charter/availability/month?formule=${formula}&mois=${month}`).then((response) => response.json()).then((payload: MonthPayload) => setDays(payload.days || [])).finally(() => setLoading(false)); }} />}
      </div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-2"><span className={`h-3 w-3 rounded-full ring-1 ${color}`} />{label}</span>;
}
