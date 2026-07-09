import Link from "next/link";
import {
  firstParam,
  getPayzenReturnStatus,
  getReturnReservationId,
  isExplicitPayzenFailure,
  markReservationPaymentFailed,
  releaseUnpaidBoatHoldsForReservation,
  type PaymentReservationTable,
} from "@/lib/paymentReturn";

type PaiementRetourSearchParams = {
  vads_order_id?: string | string[];
  vads_trans_status?: string | string[];
  vads_ext_info_reservation_table?: string | string[];
  reservationId?: string | string[];
  reservation_id?: string | string[];
  id?: string | string[];
  reservationTable?: string | string[];
  locale?: string | string[];
};

const copy = {
  fr: {
    title: "Retour de paiement",
    kicker: "Paiement non confirme.",
    text: "Le retour boutique ne valide jamais une reservation. Si PayZen confirme le paiement par notification serveur, votre reservation sera confirmee automatiquement.",
    button: "Retour a l'accueil",
    href: "/",
  },
  en: {
    title: "Payment return",
    kicker: "Payment not confirmed",
    text: "Your booking has not been confirmed because the payment was not completed.",
    button: "Back to booking",
    href: "/en",
  },
} as const;

function normalizeReservationTable(value: string) {
  if (value === "reservations_peche" || value === "reservations_baleines") {
    return value;
  }

  return "";
}

function getLocale(value: string | string[] | undefined) {
  return firstParam(value) === "en" ? "en" : "fr";
}

export default async function PaiementRetourPage({
  searchParams,
}: {
  searchParams?: Promise<PaiementRetourSearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const locale = getLocale(params.locale);
  const t = copy[locale];
  const reservationId = getReturnReservationId(params);
  const payzenStatus = getPayzenReturnStatus(params);
  const reservationTable = normalizeReservationTable(
    firstParam(params.vads_ext_info_reservation_table) ||
      firstParam(params.reservationTable) ||
      ""
  );

  if (reservationId && reservationTable) {
    if (isExplicitPayzenFailure(payzenStatus)) {
      await markReservationPaymentFailed(
        reservationTable as PaymentReservationTable,
        reservationId
      );
    } else {
      await releaseUnpaidBoatHoldsForReservation(
        reservationTable as PaymentReservationTable,
        reservationId
      );
    }
  }

  return (
    <main className="min-h-screen bg-sky-950 p-6 text-white">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-black">
        <h1 className="mb-4 text-3xl font-bold">{t.title}</h1>

        <p className="mb-4">{t.kicker}</p>

        <p>{t.text}</p>

        <Link
          href={t.href}
          className="mt-6 inline-block rounded-xl bg-yellow-500 px-5 py-3 font-bold text-black"
        >
          {t.button}
        </Link>
      </div>
    </main>
  );
}
