"use client";

import { useEffect, useMemo, useState } from "react";
import type { CharterFormula } from "@/lib/charter-availability";
import { CHARTER_FORMULA_DETAILS } from "@/lib/charter-pricing";
import { CharterBookingForm } from "./CharterBookingForm";

type MonthDay = { date: string; date_fin: string; available: boolean };
type MonthPayload = { formula: CharterFormula; month: string; days: MonthDay[]; error?: string };

const FORMULAS: CharterFormula[] = ["tetiaroa_2j_1n", "tetiaroa_3j_2n", "moorea_matin", "moorea_journee", "sunset"];
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function todayTahiti() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Tahiti",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function initialMonth() {
  return todayTahiti().slice(0, 7);
}

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function CharterAvailabilityCalendar() {
  const [formula, setFormula] = useState<CharterFormula>("tetiaroa_2j_1n");
  const [month, setMonth] = useState(initialMonth);
  const [days, setDays] = useState<MonthDay[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingConflict, setBookingConflict] = useState("");
  const today = todayTahiti();

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/charter/availability/month?formule=${formula}&mois=${month}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as MonthPayload;
        if (!response.ok) throw new Error(payload.error || "Disponibilités indisponibles.");
        setDays(payload.days);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setDays([]);
        setError(requestError instanceof Error ? requestError.message : "Disponibilités indisponibles.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [formula, month]);

  const selectedFormula = CHARTER_FORMULA_DETAILS[formula];
  const selectedDay = days.find((day) => day.date === selectedDate);
  const calendar = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const offset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
    return { offset, label: new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, monthNumber - 1, 1))) };
  }, [month]);

  function chooseFormula(nextFormula: CharterFormula) {
    setFormula(nextFormula);
    setSelectedDate("");
    setDays([]);
    setError("");
    setBookingConflict("");
    setLoading(true);
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
    <section id="reservation-charter" className="bg-[#eef9f8] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">Disponibilités</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.03em] text-cyan-950 sm:text-5xl">Réserver votre charter</h2>
          <p className="mt-4 font-semibold leading-7 text-slate-700">Choisissez votre formule puis une date disponible.</p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {FORMULAS.map((formulaId) => (
            <button key={formulaId} type="button" onClick={() => chooseFormula(formulaId)} aria-pressed={formula === formulaId} className={`min-h-24 rounded-2xl border p-4 text-left transition ${formula === formulaId ? "border-cyan-900 bg-cyan-950 text-white shadow-lg" : "border-cyan-100 bg-white text-cyan-950 hover:border-cyan-400"}`}>
              <span className="block text-sm font-black leading-5">{CHARTER_FORMULA_DETAILS[formulaId].label}</span>
              <span className={`mt-2 block text-xs font-bold ${formula === formulaId ? "text-cyan-100" : "text-slate-500"}`}>{CHARTER_FORMULA_DETAILS[formulaId].detail}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-start">
          <div className="rounded-[2rem] border border-cyan-100 bg-white p-4 shadow-[0_16px_40px_rgba(8,145,178,0.08)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => changeMonth(-1)} disabled={month <= initialMonth()} aria-label="Mois précédent" className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-100 text-xl font-black text-cyan-900 disabled:cursor-not-allowed disabled:opacity-30">‹</button>
              <p className="text-center text-base font-black capitalize text-cyan-950 sm:text-lg">{calendar.label}</p>
              <button type="button" onClick={() => changeMonth(1)} aria-label="Mois suivant" className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-100 text-xl font-black text-cyan-900">›</button>
            </div>
            <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[11px] font-black text-slate-500 sm:gap-2">{WEEKDAYS.map((day, index) => <span key={`${day}-${index}`} className="py-1">{day}</span>)}</div>
            <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-2">
              {Array.from({ length: calendar.offset }, (_, index) => <span key={`empty-${index}`} />)}
              {days.map((day) => {
                const past = day.date < today;
                const disabled = past || !day.available || loading;
                return <button key={day.date} type="button" disabled={disabled} onClick={() => { setSelectedDate(day.date); setBookingConflict(""); }} aria-label={`${dateLabel(day.date)} — ${past ? "date passée" : day.available ? "disponible" : "indisponible"}`} className={`aspect-square min-w-0 rounded-xl border text-sm font-black transition sm:text-base ${selectedDate === day.date ? "border-cyan-900 bg-cyan-900 text-white ring-2 ring-cyan-200" : past ? "border-transparent bg-slate-50 text-slate-300" : day.available ? "border-teal-200 bg-teal-50 text-teal-900 hover:border-teal-500" : "border-rose-100 bg-rose-50 text-rose-300"}`}>{Number(day.date.slice(-2))}</button>;
              })}
            </div>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-slate-600">
              <Legend color="bg-teal-100 ring-teal-300" label="Disponible" />
              <Legend color="bg-rose-50 ring-rose-200" label="Indisponible" />
              <Legend color="bg-slate-100 ring-slate-200" label="Date passée" />
            </div>
            {(loading || error) && <p className={`mt-4 text-sm font-bold ${error ? "text-rose-700" : "text-slate-500"}`}>{error || "Chargement des disponibilités…"}</p>}
            {bookingConflict && <p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-black text-rose-700">{bookingConflict}</p>}
          </div>

          <aside className="rounded-[2rem] bg-cyan-950 p-6 text-white sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Votre sélection</p>
            <h3 className="mt-3 text-2xl font-black">{selectedFormula.label}</h3>
            {selectedDay ? <div className="mt-6 space-y-3 text-sm font-semibold text-cyan-50"><p><b className="text-white">Départ :</b> {dateLabel(selectedDay.date)}</p>{formula.startsWith("tetiaroa") && <><p><b className="text-white">Retour :</b> {dateLabel(selectedDay.date_fin)}</p><p>{selectedFormula.detail}</p></>}{formula === "sunset" && <p>Horaire adapté au coucher du soleil.</p>}</div> : <p className="mt-5 text-sm font-semibold leading-6 text-cyan-100">Sélectionnez une date disponible dans le calendrier pour afficher votre récapitulatif.</p>}
          </aside>
        </div>
        {selectedDay && <CharterBookingForm key={`${formula}:${selectedDay.date}`} formula={formula} startDate={selectedDay.date} endDate={selectedDay.date_fin} onAvailabilityConflict={() => { setSelectedDate(""); setBookingConflict("Cette date vient d’être réservée. Choisissez une autre date."); setDays([]); setLoading(true); fetch(`/api/charter/availability/month?formule=${formula}&mois=${month}`).then((response) => response.json()).then((payload: MonthPayload) => setDays(payload.days || [])).finally(() => setLoading(false)); }} />}
      </div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-2"><span className={`h-3 w-3 rounded-full ring-1 ${color}`} />{label}</span>;
}
