"use client";

import { useEffect, useMemo, useState } from "react";
import { PaymentChoiceCard } from "@/components/booking/PaymentChoiceCard";
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

export function PecheBookingForm() {
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
          setError(payload.error || "Impossible de charger le calendrier bateau.");
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
        setError("Impossible de charger le calendrier bateau.");
      } finally {
        setLoadingCalendar(false);
      }
    }

    loadBoatCalendar();
  }, [date]);

  function setCapacity(value: number | "more") {
    if (value === "more") {
      setOverCapacity(true);
      return;
    }

    setPeopleCount(value);
    setOverCapacity(false);
  }

  function validateForm() {
    if (!date) return "Choisissez une date de sortie.";
    if (!formulaAvailability[formulaId]) {
      return "Ce créneau vient d'être réservé. Choisissez une autre date ou formule.";
    }
    if (overCapacity || peopleCount > 4) {
      return "La réservation en ligne est limitée à 4 personnes.";
    }
    if (peopleCount < 1) return "Indiquez au moins 1 personne.";
    if (!firstName.trim()) return "Indiquez le prénom du responsable.";
    if (!lastName.trim()) return "Indiquez le nom du responsable.";
    if (!email.trim()) return "Indiquez l'email du responsable.";
    if (!phone.trim()) return "Indiquez le téléphone du responsable.";
    if (!childrenOk) {
      return "Confirmez que les enfants ont au moins 8 ans.";
    }

    return "";
  }

  function unavailableFormulaMessage(currentFormulaId: FormulaId) {
    if (currentFormulaId === "full_day") {
      return "Journée complète indisponible sur cette date";
    }

    return "Déjà réservé";
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
          ? "Ce créneau vient d'être réservé. Choisissez une autre date ou formule."
          : reservationError || "Impossible d'enregistrer la réservation."
      );
      setSending(false);
      return;
    }

    const returnUrl = `/peche/success?formule=${selectedFormula.id}&paiement=${paymentType}`;
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
      setError(
        formatApiError(payment) || "Erreur lors de la préparation du paiement."
      );
      setSending(false);
      return;
    }

    setMessage("Réservation enregistrée. Redirection vers PayZen...");

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
              Réservation
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Choisissez votre sortie
            </h2>
          </div>
          <label className="block">
            <span className="text-sm font-black uppercase tracking-[0.14em] text-slate-600">
              <span className="mr-2">📅</span>Date
            </span>
            <div className="mt-2">
              <PecheAvailabilityCalendar
                selectedDate={date}
                onDateSelect={setDate}
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
                  } ${
                    unavailable ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-black">{formula.title}</p>
                        {unavailable && (
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-700">
                            Indisponible
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-bold">{formula.time}</p>
                      <p className="text-xs font-bold opacity-80">
                        Tolérance horaires : {formula.tolerance}
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
              {allFormulasUnavailable
                ? "Cette date n’est plus disponible. Merci de choisir une autre date."
                : "Certaines formules ne sont plus disponibles sur cette date."}
            </div>
          )}
          {loadingCalendar && (
            <p className="text-sm font-bold text-slate-500">
              Vérification du calendrier bateau...
            </p>
          )}
        </div>

        <aside className="space-y-5 rounded-3xl border border-cyan-100 bg-cyan-50 p-5 text-slate-950 shadow-[0_18px_45px_rgba(8,145,178,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(8,145,178,0.12)] md:p-7">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
              À bord
            </p>
            <h2 className="mt-2 text-2xl font-black">Tout est prêt</h2>
          </div>
          <ul className="grid gap-3 text-sm font-bold leading-6 text-slate-700">
            {[
              ["🧭", "Skipper"],
              ["🎣", "Matériel de pêche"],
              ["🥤", "Eau, sodas, bières et chips"],
              ["🥪", "Déjeuner pour la journée complète"],
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
            La pêche reste la pêche : aucune capture ne peut être garantie,
            mais nous mettons tout en œuvre pour maximiser vos chances.
          </p>
        </aside>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(8,145,178,0.12)] md:p-7">
          <h2 className="text-2xl font-black">
            <span className="mr-2">👥</span>Participants
          </h2>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
            De 1 à 4 personnes incluses. Les enfants comptent comme une
            personne et sont acceptés à partir de 8 ans.
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
                Vous souhaitez être plus de 4 personnes ? Contactez-nous pour
                une demande spécifique.
              </p>
              <div className="mt-3">
                <WhatsAppButton />
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
            Je certifie que tous les participants ont au moins 8 ans.
          </label>
        </article>

        <article className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(8,145,178,0.12)] md:p-7">
          <h2 className="text-2xl font-black">
            <span className="mr-2">🧭</span>Responsable
          </h2>
          <div className="mt-4 grid gap-3">
            <input
              className="min-h-12 rounded-2xl border border-cyan-100 bg-cyan-50/60 px-4 font-bold outline-none transition focus:border-cyan-600 focus:bg-white"
              placeholder="Prénom"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
            <input
              className="min-h-12 rounded-2xl border border-cyan-100 bg-cyan-50/60 px-4 font-bold outline-none transition focus:border-cyan-600 focus:bg-white"
              placeholder="Nom"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
            <input
              className="min-h-12 rounded-2xl border border-cyan-100 bg-cyan-50/60 px-4 font-bold outline-none transition focus:border-cyan-600 focus:bg-white"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <input
              className="min-h-12 rounded-2xl border border-cyan-100 bg-cyan-50/60 px-4 font-bold outline-none transition focus:border-cyan-600 focus:bg-white"
              placeholder="Téléphone"
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
        activityLabel="Sortie pêche"
        variant="premium"
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
        Total bateau : {formatPechePrice(selectedFormula.price)}
      </p>
    </section>
  );
}
