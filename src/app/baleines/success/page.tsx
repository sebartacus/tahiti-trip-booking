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
  vads_order_id?: string | string[];
  vads_trans_status?: string | string[];
  reservationId?: string | string[];
  reservation_id?: string | string[];
  id?: string | string[];
};

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
          {isConfirmed ? "Paiement confirme" : "Paiement non confirme"}
        </p>

        <h1 className="mt-3 text-3xl font-black leading-tight">
          {isConfirmed
            ? "Votre sortie baleines est confirmee"
            : isFailed
            ? "Reservation non finalisee"
            : "Paiement en attente de confirmation"}
        </h1>

        <p className="mt-4 text-base font-semibold leading-7 text-slate-600">
          {isConfirmed
            ? "Merci ! Votre reservation est confirmee uniquement parce que PayZen a confirme le paiement."
            : "Votre retour boutique ne valide pas la reservation. Si le paiement n'a pas ete confirme par PayZen, aucune confirmation definitive n'est envoyee."}
        </p>

        {isConfirmed ? (
          <div className="mt-6 bg-cyan-50 p-4 text-left">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
              Votre rendez-vous
            </p>
            <p className="mt-2 text-lg font-black text-cyan-950">
              Marina Taina, Punaauia
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
              Quai principal, devant les restaurants Casa Bianca.
            </p>
          </div>
        ) : (
          <div className="mt-6 bg-amber-50 p-4 text-left">
            <p className="text-sm font-bold leading-6 text-amber-950">
              Reservation non finalisee. Vous pouvez relancer une reservation
              ou nous contacter si vous pensez avoir ete debite.
            </p>
          </div>
        )}

        <Link
          href="/"
          className="mt-6 inline-flex min-h-14 items-center justify-center bg-cyan-700 px-6 text-base font-black text-white"
        >
          Retour a l&apos;accueil
        </Link>
      </section>
    </main>
  );
}
