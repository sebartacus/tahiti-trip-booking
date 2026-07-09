"use client";

import { useEffect, useMemo, useState } from "react";
import { PaymentChoiceCard } from "@/components/booking/PaymentChoiceCard";
import { pecheBookingTranslations, type Locale } from "@/lib/i18n";
import {
  formatPechePrice,
  PECHE_FORMULAS,
  type BoatSlotName,
  type FormulaId,
  type PaymentType,
} from "./constants";
import { PecheAvailabilityCalendar } from "./PecheAvailabilityCalendar";
import { WhatsAppButton } from "./WhatsAppButton";

type BoatSlotStatus = "available" | "hold" | "reserved" | "blocked";

type BoatCalendarSlot = {
  date: string;
  slot: BoatSlotName;
  status: BoatSlotStatus;
  activity: "baleines" | "peche" | "peche_nuit" | null;
};

type PecheBookingFormProps = {
  locale?: Locale;
};

function isSlotAvailable(slot: BoatCalendarSlot | undefined) {
  return !slot || slot.status === "available";
}

function formatApiError(payload: {
  error?: string;
  code?: string;
  details?: string;
  hint?: string;
}) {
  return [payload.error, payload.code, payload.details, payload.hint]
    .filter(Boolean)
    .join(" | ");
}

async function readJsonOrText(response: Response) {
  const responseText = await response.text();

  if (!responseText) return {};

  try {
    return JSON.parse(responseText);
  } catch {
    return { error: responseText };
  }
}

export function PecheBookingForm({ locale = "fr" }: PecheBookingFormProps) {
  const t = pecheBookingTranslations[locale];
  const [date, setDate] = useState("");
  const [formulaId, setFormulaId] = useState<FormulaId>("morning");
  const [peopleCount, setPeopleCount] = useState(2);
  const [overCapacity, setOverCapacity] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [childrenOk, setChildrenOk] = useState(false);
  const [boatSlots, setBoatSlots] = useState<
    Partial<Record<BoatSlotName, BoatCalendarSlot>>
  >({});
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedFormula = useMemo(
    () =>
      PECHE_FORMULAS.find((formula) => formula.id === formulaId) ||
      PECHE_FORMULAS[0],
    [formulaId]
  );

  const formulaAvailability = useMemo(() => {
    return PECHE_FORMULAS.reduce<Record<FormulaId, boolean>>(
      (availability, formula) => {
        availability[formula.id] = formula.slots.every((slot) =>
          isSlotAvailable(boatSlots[slot])
        );
        return availability;
      },
      { morning: true, afternoon: true, full_day: true }
    );
  }, [boatSlots]);

  const hasUnavailableFormula =
    Boolean(date) &&
    PECHE_FORMULAS.some((formula) => !formulaAvailability[formula.id]);
  const allFormulasUnavailable =
    Boolean(date) &&
    PECHE_FORMULAS.every((formula) => !formulaAvailability[formula.id]);

  useEffect(() => {
    async function loadBoatCalendar() {
      if (!date) {
        setBoatSlots({});
        return;
      }

      setLoadingCalendar(true);
      setError("");

      try {
        const response = await fetch(
          `/api/bateau/calendar?from=${date}&to=${date}`
        );
        const payload = await response.json();

        if (!response.ok) {
          setBoatSlots({});
          setError(payload.error || t.errors.loadBoatCalendar);
          return;
        }

        const nextSlots: Partial<Record<BoatSlotName, BoatCalendarSlot>> = {};
        const apiSlots = Array.isArray(payload.slots)
          ? (payload.slots as BoatCalendarSlot[])
          : [];

        for (const slot of apiSlots) {
          if (slot.slot === "morning" || slot.slot === "afternoon") {
            nextSlots[slot.slot] = slot;
          }
        }

        setBoatSlots(nextSlots);
      } catch {
        setBoatSlots({});
        setError(t.errors.loadBoatCalendar);
      } finally {
        setLoadingCalendar(false);
      }
    }

    loadBoatCalendar();
  }, [date, t.errors.loadBoatCalendar]);

  function setCapacity(value: number | "more") {
    if (value === "more") {
      setOverCapacity(true);
      return;
    }

    setPeopleCount(value);
    setOverCapacity(false);
  }

  function validateForm() {
    if (!date) return t.errors.chooseDate;
    if (!formulaAvailability[formulaId]) return t.errors.slotReserved;
    if (overCapacity || peopleCount > 4) return t.errors.onlineLimit;
    if (peopleCount < 1) return t.errors.minimumOne;
    if (!firstName.trim()) return t.errors.firstName;
    if (!lastName.trim()) return t.errors.lastName;
    if (!email.trim()) return t.errors.email;
    if (!phone.trim()) return t.errors.phone;
    if (!childrenOk) return t.errors.children;

    return "";
  }

  function unavailableFormulaMessage(currentFormulaId: FormulaId) {
    if (currentFormulaId === "full_day") return t.unavailableFullDay;

    return t.unavailableFormula;
  }

  async function reserve(paymentType: PaymentType) {
    if (sending) return;

    setError("");
    setMessage("");

    const problem = validateForm();
    if (problem) {
      setError(problem);
      return;
    }

    setSending(true);

    const paidAmount =
      paymentType === "deposit"
        ? Math.round(selectedFormula.price * 0.3)
        : selectedFormula.price;

    const reservationResponse = await fetch("/api/peche/reservation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date,
        formulaId: selectedFormula.id,
        peopleCount,
        firstName,
        lastName,
        email,
        phone,
        paymentType,
      }),
    });

    const reservation = await readJsonOrText(reservationResponse);

    if (!reservationResponse.ok || !reservation.reservationId) {
      const reservationError = formatApiError(reservation);

      setError(
        reservationResponse.status === 409
          ? t.errors.slotReserved
          : reservationError || t.errors.saveReservation
      );
      setSending(false);
      return;
    }

    const returnUrl = `/peche/success?formule=${selectedFormula.id}&paiement=${paymentType}&reservationId=${reservation.reservationId}&locale=${locale}`;
    const payzenResponse = await fetch("/api/payzen", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        montant: paidAmount,
        email: email.trim(),
        reservationId: reservation.reservationId,
        reservationTable: "reservations_peche",
        activity: "peche",
        returnUrl,
      }),
    });

    const payment = await readJsonOrText(payzenResponse);

    if (!payzenResponse.ok) {
      console.error(payment);
      setError(formatApiError(payment) || t.errors.preparePayment);
      setSending(false);
      return;
    }

    setMessage(t.reservationSaved);

    const form = document.createElement("form");
    form.method = "POST";
    form.action = payment.url;

    Object.entries(payment.champs).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = String(value);
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  }

  return (
    <section className="peche-reveal space-y-6">
      <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5 rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.10)] transition duration-300 hover:shadow-[0_22px_50px_rgba(8,145,178,0.13)] md:p-7">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
              {t.bookingEyebrow}
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">
              {t.chooseTrip}
            </h2>
          </div>

          <label className="block">
            <span className="text-sm font-black uppercase tracking-[0.14em] text-slate-600">
              <span className="mr-2" aria-hidden="true">
                📅
              </span>
              {t.date}
            </span>
            <div className="mt-2">
              <PecheAvailabilityCalendar
                selectedDate={date}
                onDateSelect={setDate}
                labels={t.calendar}
              />
            </div>
          </label>

          <div className="grid gap-3">
            {PECHE_FORMULAS.map((formula) => {
              const available = formulaAvailability[formula.id];
              const unavailable = Boolean(date) && !available;

              return (
                <button
                  key={formula.id}
                  type="button"
                  disabled={unavailable}
                  onClick={() => setFormulaId(formula.id)}
                  aria-disabled={unavailable}
                  className={`min-h-24 rounded-2xl border p-4 text-left shadow-sm transition duration-300 ${
                    unavailable
                      ? "border-slate-200 bg-slate-100 text-slate-500 opacity-70"
                      : formulaId === formula.id
                      ? "border-cyan-700 bg-cyan-700 text-white shadow-[0_14px_28px_rgba(8,145,178,0.18)]"
                      : "border-cyan-100 bg-white text-slate-950 hover:-translate-y-0.5 hover:border-cyan-300"
                  } ${unavailable ? "cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-black">
                          {t.formulas[formula.id]}
                        </p>
                        {unavailable && (
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-700">
                            {t.unavailable}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-bold">{formula.time}</p>
                      <p className="text-xs font-bold opacity-80">
                        {t.tolerance} : {formula.tolerance}
                      </p>
                    </div>
                    <p className="shrink-0 text-lg font-black">
                      {formatPechePrice(formula.price)}
                    </p>
                  </div>
                  {unavailable && (
                    <p className="mt-3 text-sm font-black">
                      {unavailableFormulaMessage(formula.id)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {hasUnavailableFormula && (
            <div
              className={`rounded-2xl border p-4 text-sm font-black leading-6 ${
                allFormulasUnavailable
                  ? "border-amber-200 bg-amber-50 text-amber-950"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              {allFormulasUnavailable ? t.dateUnavailable : t.partialUnavailable}
            </div>
          )}

          {loadingCalendar && (
            <p className="text-sm font-bold text-slate-500">
              {t.checkingBoat}
            </p>
          )}
        </div>

        <aside className="space-y-5 rounded-3xl border border-cyan-100 bg-cyan-50 p-5 text-slate-950 shadow-[0_18px_45px_rgba(8,145,178,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(8,145,178,0.12)] md:p-7">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
              {t.onboardEyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-black">{t.allReady}</h2>
          </div>
          <ul className="grid gap-3 text-sm font-bold leading-6 text-slate-700">
            {[
              ["🧭", t.skipper],
              ["🎣", t.fishingGear],
              ["🥤", t.drinks],
              ["🥪", t.fullDayLunch],
            ].map(([icon, label]) => (
              <li
                key={label}
                className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm"
              >
                <span className="text-xl">{icon}</span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <p className="rounded-2xl border border-cyan-100 bg-white p-4 text-sm font-bold leading-6 text-slate-700">
            {t.fishingDisclaimer}
          </p>
        </aside>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(8,145,178,0.12)] md:p-7">
          <h2 className="text-2xl font-black">
            <span className="mr-2" aria-hidden="true">
              👥
            </span>
            {t.participants}
          </h2>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            {t.participantsText}
          </p>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {[1, 2, 3, 4].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCapacity(value)}
                className={`min-h-12 rounded-2xl border text-base font-black transition ${
                  !overCapacity && peopleCount === value
                    ? "border-cyan-700 bg-cyan-700 text-white"
                    : "border-cyan-100 bg-cyan-50 text-slate-950 hover:border-cyan-300"
                }`}
              >
                {value}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCapacity("more")}
              className={`min-h-12 rounded-2xl border text-base font-black transition ${
                overCapacity
                  ? "border-cyan-700 bg-cyan-700 text-white"
                  : "border-cyan-100 bg-cyan-50 text-slate-950 hover:border-cyan-300"
              }`}
            >
              5+
            </button>
          </div>

          {overCapacity && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-black leading-6 text-amber-950">
                {t.moreThanFour}
              </p>
              <div className="mt-3">
                <WhatsAppButton label={t.whatsappLabel} />
              </div>
            </div>
          )}

          <label className="mt-5 flex items-start gap-3 text-sm font-bold leading-6 text-slate-700">
            <input
              type="checkbox"
              checked={childrenOk}
              onChange={(event) => setChildrenOk(event.target.checked)}
              className="mt-1"
            />
            {t.childrenOk}
          </label>
        </article>

        <article className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(8,145,178,0.12)] md:p-7">
          <h2 className="text-2xl font-black">
            <span className="mr-2" aria-hidden="true">
              🧭
            </span>
            {t.manager}
          </h2>
          <div className="mt-4 grid gap-3">
            <input
              className="min-h-12 rounded-2xl border border-cyan-100 bg-cyan-50/60 px-4 font-bold outline-none transition focus:border-cyan-600 focus:bg-white"
              placeholder={t.firstName}
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
            <input
              className="min-h-12 rounded-2xl border border-cyan-100 bg-cyan-50/60 px-4 font-bold outline-none transition focus:border-cyan-600 focus:bg-white"
              placeholder={t.lastName}
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
            <input
              className="min-h-12 rounded-2xl border border-cyan-100 bg-cyan-50/60 px-4 font-bold outline-none transition focus:border-cyan-600 focus:bg-white"
              placeholder={t.email}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <input
              className="min-h-12 rounded-2xl border border-cyan-100 bg-cyan-50/60 px-4 font-bold outline-none transition focus:border-cyan-600 focus:bg-white"
              placeholder={t.phone}
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
        </article>
      </section>

      <PaymentChoiceCard
        totalAmount={selectedFormula.price}
        depositPercent={30}
        activityLabel={t.activityLabel}
        variant="premium"
        labels={t.payment}
        onSelectDeposit={() => reserve("deposit")}
        onSelectFullPayment={() => reserve("full")}
      />

      {(error || message) && (
        <div
          className={`p-4 text-sm font-black ${
            error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {error || message}
        </div>
      )}

      <p className="text-center text-sm font-black text-cyan-800">
        {t.totalBoat} : {formatPechePrice(selectedFormula.price)}
      </p>
    </section>
  );
}
