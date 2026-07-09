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
};

function normalizeReservationTable(value: string) {
  if (value === "reservations_peche" || value === "reservations_baleines") {
    return value;
  }

  return "";
}

export default async function PaiementRetourPage({
  searchParams,
}: {
  searchParams?: Promise<PaiementRetourSearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
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
        <h1 className="mb-4 text-3xl font-bold">Retour de paiement</h1>

        <p className="mb-4">Paiement non confirme.</p>

        <p>
          Le retour boutique ne valide jamais une reservation. Si PayZen
          confirme le paiement par notification serveur, votre reservation sera
          confirmee automatiquement.
        </p>

        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-yellow-500 px-5 py-3 font-bold text-black"
        >
          Retour a l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
