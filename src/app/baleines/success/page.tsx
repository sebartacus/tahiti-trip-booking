import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  getPaymentDisplayStatus,
  getPayzenReturnStatus,
  getReturnReservationId,
  isExplicitPayzenFailure,
  markReservationPaymentFailed,
  releaseUnpaidBoatHoldsForReservation,
} from "@/lib/paymentReturn";

type SuccessSearchParams = {
  locale?: string | string[];
  vads_order_id?: string | string[];
  vads_trans_status?: string | string[];
  reservationId?: string | string[];
  reservation_id?: string | string[];
  id?: string | string[];
};

const copy = {
  fr: {
    paidKicker: "Paiement confirme",
    unpaidKicker: "Paiement non confirme",
    confirmedTitle: "Votre sortie baleines est confirmee",
    failedTitle: "Reservation non finalisee",
    pendingTitle: "Paiement en attente de confirmation",
    confirmedText:
      "Merci ! Votre reservation est confirmee uniquement parce que PayZen a confirme le paiement.",
    unpaidText:
      "Votre retour boutique ne valide pas la reservation. Si le paiement n'a pas ete confirme par PayZen, aucune confirmation definitive n'est envoyee.",
    meeting: "Votre rendez-vous",
    dock: "Quai principal, devant les restaurants Casa Bianca.",
    unpaidBox:
      "Reservation non finalisee. Vous pouvez relancer une reservation ou nous contacter si vous pensez avoir ete debite.",
    button: "Retour a l'accueil",
    href: "/baleines",
  },
  en: {
    paidKicker: "Payment confirmed",
    unpaidKicker: "Payment not confirmed",
    confirmedTitle: "Your whale watching trip is confirmed",
    failedTitle: "Payment not confirmed",
    pendingTitle: "Payment not confirmed",
    confirmedText:
      "Thank you. Your booking is confirmed only because PayZen confirmed the payment.",
    unpaidText:
      "Your booking has not been confirmed because the payment was not completed.",
    meeting: "Meeting point",
    dock: "Main dock, in front of the Casa Bianca restaurants.",
    unpaidBox:
      "Your booking has not been confirmed because the payment was not completed.",
    button: "Back to booking",
    href: "/en/whale-watching",
  },
} as const;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getLocale(value: string | string[] | undefined) {
  return firstParam(value) === "en" ? "en" : "fr";
}

async function getReservationStatus(
  reservationId: string,
  payzenStatus: string
) {
  if (!reservationId) return "pending";

  if (isExplicitPayzenFailure(payzenStatus)) {
    await markReservationPaymentFailed("reservations_baleines", reservationId);
  }

  const { data } = await supabase
    .from("reservations_baleines")
    .select("statut_paiement,paye")
    .eq("id", reservationId)
    .maybeSingle();

  if (!data) return "pending";

  const status = getPaymentDisplayStatus(data);

  if (status !== "confirmed") {
    await releaseUnpaidBoatHoldsForReservation(
      "reservations_baleines",
      reservationId
    );
  }

  return status;
}

export default async function BaleinesSuccessPage({
  searchParams,
}: {
  searchParams?: Promise<SuccessSearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const locale = getLocale(params.locale);
  const t = copy[locale];
  const reservationId = getReturnReservationId(params);
  const payzenStatus = getPayzenReturnStatus(params);
  const status = await getReservationStatus(reservationId, payzenStatus);
  const isConfirmed = status === "confirmed";
  const isFailed = status === "failed";

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

        {isConfirmed ? (
          <div className="mt-6 bg-cyan-50 p-4 text-left">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
              {t.meeting}
            </p>
            <p className="mt-2 text-lg font-black text-cyan-950">
              Marina Taina, Punaauia
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
              {t.dock}
            </p>
          </div>
        ) : (
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
