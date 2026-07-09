import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  firstParam,
  getPaymentDisplayStatus,
  getPayzenReturnStatus,
  getReturnReservationId,
  isExplicitPayzenFailure,
  markReservationPaymentFailed,
  releaseUnpaidBoatHoldsForReservation,
} from "@/lib/paymentReturn";

type SuccessSearchParams = {
  formule?: string | string[];
  paiement?: string | string[];
  locale?: string | string[];
  vads_order_id?: string | string[];
  vads_trans_status?: string | string[];
  reservationId?: string | string[];
  reservation_id?: string | string[];
  id?: string | string[];
};

const FORMULA_HOURS: Record<string, string> = {
  morning: "07h15 - 12h00",
  afternoon: "13h15 - 17h45",
  full_day: "07h15 - 15h45",
};

const copy = {
  fr: {
    paidKicker: "Paiement confirme",
    unpaidKicker: "Paiement non confirme",
    confirmedTitle: "Votre sortie de peche est confirmee",
    failedTitle: "Reservation non finalisee",
    pendingTitle: "Paiement en attente de confirmation",
    confirmedText:
      "Merci ! Votre reservation est confirmee uniquement parce que PayZen a confirme le paiement.",
    unpaidText:
      "Votre retour boutique ne valide pas la reservation. Si le paiement n'a pas ete confirme par PayZen, aucune confirmation definitive n'est envoyee.",
    meeting: "Votre rendez-vous",
    departure: "Depart Marina Taina, Punaauia",
    dock: "Quai principal devant Casa Bianca.",
    hoursPrefix: "Horaires",
    tolerance: "Une tolerance de +/- 30 min peut s'appliquer.",
    deposit:
      "Vous avez regle un acompte. Le solde sera a regler le jour de la sortie.",
    unpaidBox:
      "Reservation non finalisee. Vous pouvez relancer une reservation ou nous contacter si vous pensez avoir ete debite.",
    button: "Retour a l'accueil",
    href: "/peche",
    defaultHours: "selon la formule reservee",
  },
  en: {
    paidKicker: "Payment confirmed",
    unpaidKicker: "Payment not confirmed",
    confirmedTitle: "Your fishing trip is confirmed",
    failedTitle: "Payment not confirmed",
    pendingTitle: "Payment not confirmed",
    confirmedText:
      "Thank you. Your booking is confirmed only because PayZen confirmed the payment.",
    unpaidText:
      "Your booking has not been confirmed because the payment was not completed.",
    meeting: "Meeting point",
    departure: "Departure from Marina Taina, Punaauia",
    dock: "Main dock in front of Casa Bianca.",
    hoursPrefix: "Time",
    tolerance: "A +/- 30 min tolerance may apply.",
    deposit:
      "You paid a deposit. The balance will be paid on the day of the trip.",
    unpaidBox:
      "Your booking has not been confirmed because the payment was not completed.",
    button: "Back to booking",
    href: "/en/fishing",
    defaultHours: "according to the selected trip",
  },
} as const;

function getLocale(value: string | string[] | undefined) {
  return firstParam(value) === "en" ? "en" : "fr";
}

async function getReservationStatus(
  reservationId: string,
  payzenStatus: string
) {
  if (!reservationId) {
    return {
      status: "pending" as const,
      formula: "",
      paymentType: "",
    };
  }

  if (isExplicitPayzenFailure(payzenStatus)) {
    await markReservationPaymentFailed("reservations_peche", reservationId);
  }

  const { data } = await supabase
    .from("reservations_peche")
    .select("statut_paiement,paye,formule,type_paiement")
    .eq("id", reservationId)
    .maybeSingle();

  if (!data) {
    return {
      status: "pending" as const,
      formula: "",
      paymentType: "",
    };
  }

  const status = getPaymentDisplayStatus(data);

  if (status !== "confirmed") {
    await releaseUnpaidBoatHoldsForReservation(
      "reservations_peche",
      reservationId
    );
  }

  return {
    status,
    formula: String(data.formule || ""),
    paymentType: String(data.type_paiement || ""),
  };
}

export default async function PecheSuccessPage({
  searchParams,
}: {
  searchParams?: Promise<SuccessSearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const locale = getLocale(params.locale);
  const t = copy[locale];
  const reservationId = getReturnReservationId(params);
  const payzenStatus = getPayzenReturnStatus(params);
  const reservation = await getReservationStatus(reservationId, payzenStatus);
  const formula = reservation.formula || firstParam(params.formule) || "";
  const payment = reservation.paymentType || firstParam(params.paiement) || "";
  const hours = FORMULA_HOURS[formula] || t.defaultHours;
  const isConfirmed = reservation.status === "confirmed";
  const isFailed = reservation.status === "failed";

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-slate-950">
      <section className="mx-auto max-w-md border border-cyan-100 bg-white p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <p
          className={`text-sm font-black uppercase tracking-[0.16em] ${
            isConfirmed ? "text-cyan-700" : "text-amber-700"
          }`}
        >
          {isConfirmed ? t.paidKicker : t.unpaidKicker}
        </p>

        <h1 className="mt-3 text-3xl font-black leading-tight">
          {isConfirmed
            ? t.confirmedTitle
            : isFailed
            ? t.failedTitle
            : t.pendingTitle}
        </h1>

        <p className="mt-4 text-base font-semibold leading-7 text-slate-600">
          {isConfirmed
            ? t.confirmedText
            : t.unpaidText}
        </p>

        {isConfirmed && (
          <div className="mt-6 bg-cyan-50 p-4 text-left">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
              {t.meeting}
            </p>
            <p className="mt-2 text-lg font-black text-cyan-950">
              {t.departure}
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
              {t.dock}
            </p>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
              {t.hoursPrefix} : {hours}. {t.tolerance}
            </p>
          </div>
        )}

        {isConfirmed && payment === "deposit" && (
          <div className="mt-4 bg-amber-50 p-4 text-left">
            <p className="text-sm font-bold leading-6 text-amber-950">
              {t.deposit}
            </p>
          </div>
        )}

        {!isConfirmed && (
          <div className="mt-6 bg-amber-50 p-4 text-left">
            <p className="text-sm font-bold leading-6 text-amber-950">
              {t.unpaidBox}
            </p>
          </div>
        )}

        <Link
          href={t.href}
          className="mt-6 inline-flex min-h-14 items-center justify-center bg-cyan-700 px-6 text-base font-black text-white"
        >
          {t.button}
        </Link>
      </section>
    </main>
  );
}
