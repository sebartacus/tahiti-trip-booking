"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { CharterFormula } from "@/lib/charter-availability";
import { salonEvaluationDate, useSalonActive } from "@/hooks/useSalonActive";
import {
  CHARTER_FORMULA_DETAILS,
  formatXpf,
  getCharterPaymentAmounts,
  getCharterPrice,
  validateCharterBooking,
  type CharterPaymentType,
  type SunsetDrink,
} from "@/lib/charter-pricing";

type Props = {
  formula: CharterFormula;
  startDate: string;
  endDate: string;
  onAvailabilityConflict: () => void;
  locale?: "fr" | "en";
};

type ReservationResponse = {
  error?: string;
  reservation_id?: string;
  montant_a_payer?: number;
  hold_expires_at?: string;
};

type PayzenResponse = {
  error?: string;
  url?: string;
  champs?: Record<string, string>;
};

function redirectToPayzen(url: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = url;
  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

function dateLabel(value: string, en = false) {
  return new Intl.DateTimeFormat(en ? "en-US" : "fr-FR", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

const inputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-cyan-100 bg-cyan-50/50 px-4 font-semibold text-slate-950 outline-none transition focus:border-cyan-600 focus:bg-white";

function EnglishFormula({ formula }: { formula: CharterFormula }) {
  return <>{({ tetiaroa_2j_1n: "Tetiaroa 2 days / 1 night", tetiaroa_3j_2n: "Tetiaroa 3 days / 2 nights", moorea_matin: "Moorea 7 AM–1 PM", moorea_journee: "Moorea full day", sunset: "Private Sunset" })[formula]}</>;
}

export function CharterBookingForm({ formula, startDate, endDate, onAvailabilityConflict, locale = "fr" }: Props) {
  const salonActive = useSalonActive();
  const en = locale === "en";
  const details = CHARTER_FORMULA_DETAILS[formula];
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [participants, setParticipants] = useState(1);
  const [sunsetDrink, setSunsetDrink] = useState<SunsetDrink | "">("");
  const [champagneSupplement, setChampagneSupplement] = useState(false);
  const [sleepingAccepted, setSleepingAccepted] = useState(false);
  const [conditionsAccepted, setConditionsAccepted] = useState(false);
  const [paymentType, setPaymentType] = useState<CharterPaymentType>("deposit");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [reservation, setReservation] = useState<ReservationResponse | null>(null);

  const total = useMemo(
    () => {
      void salonActive;
      return getCharterPrice(formula, participants, champagneSupplement, salonEvaluationDate(salonActive));
    },
    [champagneSupplement, formula, participants, salonActive]
  );
  const payment = getCharterPaymentAmounts(total, paymentType);
  const needsSleepingAcceptance = details.isTetiaroa && participants === 9;

  function changeParticipants(value: number) {
    setParticipants(value);
    setMessage("");
    setError("");
    if (value !== 9) setSleepingAccepted(false);
    if (formula === "sunset") {
      if (value > 2) setSunsetDrink("");
      if (value <= 2) setChampagneSupplement(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || reservation?.reservation_id) return;
    setMessage("");
    const validationError = validateCharterBooking({
      formula, firstName, lastName, phone, email, participants,
      sunsetDrinkSelected: Boolean(sunsetDrink), sleepingAccepted, conditionsAccepted,
    });
    if (validationError) return setError(en ? "Please complete all required fields and accept the applicable terms." : validationError);

    setError("");
    setSending(true);
    try {
      const response = await fetch("/api/charter/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formule: formula,
          date_debut: startDate,
          nombre_personnes: participants,
          responsable_prenom: firstName,
          responsable_nom: lastName,
          responsable_email: email,
          responsable_tel: phone,
          sunset_drink:
            formula === "sunset"
              ? participants <= 2
                ? sunsetDrink
                : "white_wine"
              : null,
          champagne_supplement: formula === "sunset" && participants >= 3 && champagneSupplement,
          type_paiement: paymentType,
          sleeping_arrangement_accepted: sleepingAccepted,
          conditions_accepted: conditionsAccepted,
        }),
      });
      const payload = (await response.json()) as ReservationResponse;
      if (!response.ok) {
        if (response.status === 409) {
          onAvailabilityConflict();
          return;
        }
        setError(en ? "Unable to save your booking." : payload.error || "Impossible d’enregistrer la réservation.");
        return;
      }
      setReservation(payload);
      setMessage(en ? "Preparing payment…" : "Préparation du paiement…");
      const payzenResponse = await fetch("/api/payzen-charter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservation_id: payload.reservation_id, locale }),
      });
      const payzen = (await payzenResponse.json()) as PayzenResponse;
      if (!payzenResponse.ok || !payzen.url || !payzen.champs) {
        setReservation(null);
        setMessage("");
        setError(en ? "Unable to prepare payment. Your date is being held temporarily." : payzen.error || "Impossible de préparer le paiement. Votre date reste maintenue temporairement.");
        return;
      }
      redirectToPayzen(payzen.url, payzen.champs);
    } catch {
      setError(en ? "Unable to save your booking at this time." : "Impossible d’enregistrer la réservation pour le moment.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
      <div className="rounded-[2rem] border border-cyan-100 bg-white p-5 shadow-[0_16px_40px_rgba(8,145,178,0.08)] sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">{en ? "Your details" : "Vos informations"}</p>
        <h3 className="mt-3 text-2xl font-black text-cyan-950 sm:text-3xl">{en ? "Prepare your booking" : "Préparer votre demande"}</h3>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label={en ? "First name" : "Prénom"}><input value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" className={inputClass} /></Field>
          <Field label={en ? "Last name" : "Nom"}><input value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" className={inputClass} /></Field>
          <Field label={en ? "Phone" : "Téléphone"}><input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" autoComplete="tel" className={inputClass} /></Field>
          <Field label={en ? "Email" : "E-mail"}><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" className={inputClass} /></Field>
        </div>

        <label className="mt-5 block text-sm font-black text-slate-700">
          {en ? "Number of guests" : "Nombre de participants"}
          <select value={participants} onChange={(event) => changeParticipants(Number(event.target.value))} className={inputClass}>
            {Array.from({ length: details.maxParticipants }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value} {value === 1 ? "participant" : "participants"}</option>)}
          </select>
        </label>

        {formula === "sunset" && participants <= 2 && (
          <fieldset className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <legend className="px-1 text-sm font-black text-amber-950">{en ? "Included drink" : "Boisson incluse"}</legend>
            <Choice checked={sunsetDrink === "white_wine"} onChange={() => setSunsetDrink("white_wine")} name="sunset-drink" label={en ? "White wine included" : "Vin blanc inclus"} />
            <Choice checked={sunsetDrink === "champagne_included"} onChange={() => setSunsetDrink("champagne_included")} name="sunset-drink" label={en ? "Champagne included" : "Champagne inclus"} />
          </fieldset>
        )}

        {formula === "sunset" && participants >= 3 && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
            <p>{en ? "White wine included." : "Vin blanc inclus."}</p>
            <label className="mt-3 flex cursor-pointer items-start gap-3 font-black"><input type="checkbox" checked={champagneSupplement} onChange={(event) => setChampagneSupplement(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" />Champagne +15 000 F CFP</label>
          </div>
        )}

        {needsSleepingAcceptance && (
          <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-slate-700">
            <p className="font-semibold">{en ? "For 9 guests, the Lagoon has 4 double cabins. The ninth sleeping space is prepared in the saloon." : "Pour 9 participants, le Lagoon dispose de 4 cabines doubles. Le 9e couchage est installé dans le carré du catamaran."}</p>
            <label className="mt-3 flex cursor-pointer items-start gap-3 font-black text-cyan-950"><input type="checkbox" checked={sleepingAccepted} onChange={(event) => setSleepingAccepted(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" />{en ? "I understand the sleeping arrangements." : "J’ai pris connaissance de l’organisation des couchages."}</label>
          </div>
        )}

        <fieldset className="mt-7">
          <legend className="text-lg font-black text-cyan-950">{en ? "Payment choice" : "Comment souhaitez-vous régler ?"}</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <PaymentChoice checked={paymentType === "deposit"} onChange={() => setPaymentType("deposit")} title={en ? "30% deposit" : "Acompte de 30 %"} amount={formatXpf(payment.deposit)} detail={`${en ? "Balance" : "Solde"}: ${formatXpf(payment.balance)}`} />
            <PaymentChoice checked={paymentType === "full"} onChange={() => setPaymentType("full")} title={en ? "Full payment" : "Paiement intégral"} amount={formatXpf(total)} detail={en ? "No remaining balance" : "Aucun solde restant"} />
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">{en ? "If a 30% deposit is paid, the remaining balance must be paid no later than the day before departure." : "En cas de paiement d’un acompte de 30 %, le solde est à régler au plus tard la veille du départ."}</p>
        </fieldset>

        <div className="mt-7 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          <label className="flex cursor-pointer items-start gap-3 font-black text-slate-900"><input type="checkbox" checked={conditionsAccepted} onChange={(event) => setConditionsAccepted(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" />{en ? "I accept the booking and cancellation terms." : "J’accepte les conditions de réservation et d’annulation."}</label>
          <p className="mt-3 font-semibold">{en ? "In case of cancellation due to weather conditions, amounts paid are refunded minus 3% bank fees." : "En cas d’annulation pour raisons météorologiques, les sommes versées sont remboursées, déduction faite de 3 % correspondant aux frais bancaires."}</p>
        </div>

        <button type="submit" disabled={sending || Boolean(reservation?.reservation_id)} className="mt-6 min-h-14 w-full rounded-full bg-teal-700 px-6 text-base font-black text-white shadow-lg transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-teal-300">{sending ? (reservation?.reservation_id ? (en ? "Preparing payment…" : "Préparation du paiement…") : (en ? "Checking availability…" : "Vérification des disponibilités…")) : (en ? "Continue to payment" : "Continuer vers le paiement")}</button>
        {(error || message) && <p role="status" className={`mt-4 rounded-2xl p-4 text-sm font-black ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>{error || message}</p>}
      </div>

      <aside className="rounded-[2rem] bg-cyan-950 p-6 text-white lg:sticky lg:top-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">{en ? "Summary" : "Récapitulatif"}</p>
        <h3 className="mt-3 text-2xl font-black">{en ? <EnglishFormula formula={formula} /> : details.label}</h3>
        <div className="mt-6 space-y-3 text-sm font-semibold text-cyan-50">
          <p><b className="text-white">{en ? "Departure:" : "Départ :"}</b> {dateLabel(startDate, en)}</p>
          {details.isTetiaroa && <p><b className="text-white">{en ? "Return:" : "Retour :"}</b> {dateLabel(endDate, en)}</p>}
          {details.isTetiaroa && <p>{en ? (formula === "tetiaroa_2j_1n" ? "One night aboard" : "Two nights aboard") : details.detail}</p>}
          <p><b className="text-white">{en ? "Guests:" : "Participants :"}</b> {participants}</p>
          {formula === "sunset" && participants <= 2 && <p><b className="text-white">{en ? "Drink:" : "Boisson :"}</b> {sunsetDrink === "champagne_included" ? (en ? "Champagne included" : "Champagne inclus") : sunsetDrink === "white_wine" ? (en ? "White wine included" : "Vin blanc inclus") : (en ? "To be selected" : "À choisir")}</p>}
          {formula === "sunset" && participants >= 3 && <p><b className="text-white">{en ? "Drink:" : "Boisson :"}</b> {champagneSupplement ? "Champagne (+15 000 F CFP)" : (en ? "White wine included" : "Vin blanc inclus")}</p>}
        </div>
        <div className="mt-7 border-t border-white/15 pt-6">
          <p className="text-sm font-bold text-cyan-200">{en ? "Total amount" : "Montant total"}</p>
          <p className="mt-1 text-3xl font-black sm:text-4xl">{formatXpf(total)}</p>
          <p className="mt-4 text-sm font-semibold text-cyan-100">{en ? "Due now:" : "À régler maintenant :"} <b className="text-white">{formatXpf(payment.amountToPay)}</b></p>
          {paymentType === "deposit" && <p className="mt-2 text-sm font-semibold text-cyan-100">{en ? "Balance:" : "Solde :"} <b className="text-white">{formatXpf(payment.balance)}</b></p>}
        </div>
      </aside>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-black text-slate-700">{label}{children}</label>;
}

function Choice({ checked, onChange, name, label }: { checked: boolean; onChange: () => void; name: string; label: string }) {
  return <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-white px-4 font-bold"><input type="radio" name={name} checked={checked} onChange={onChange} className="h-5 w-5" />{label}</label>;
}

function PaymentChoice({ checked, onChange, title, amount, detail }: { checked: boolean; onChange: () => void; title: string; amount: string; detail: string }) {
  return <label className={`cursor-pointer rounded-2xl border p-4 transition ${checked ? "border-teal-700 bg-teal-50" : "border-slate-200 bg-white"}`}><span className="flex items-start gap-3"><input type="radio" name="payment-type" checked={checked} onChange={onChange} className="mt-1 h-5 w-5 shrink-0" /><span><b className="block text-slate-950">{title}</b><strong className="mt-2 block text-xl text-cyan-950">{amount}</strong><span className="mt-1 block text-xs font-semibold text-slate-600">{detail}</span></span></span></label>;
}
