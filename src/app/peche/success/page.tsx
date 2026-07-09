import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  firstParam,
  getPaymentDisplayStatus,
  getPayzenReturnStatus,
  getReturnReservationId,
  isExplicitPayzenFailure,
  markReservationPaymentFailed,
} from "@/lib/paymentReturn";

type SuccessSearchParams = {
  formule?: string | string[];
  paiement?: string | string[];
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

  return {
    status: getPaymentDisplayStatus(data),
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
  const reservationId = getReturnReservationId(params);
  const payzenStatus = getPayzenReturnStatus(params);
  const reservation = await getReservationStatus(reservationId, payzenStatus);
  const formula = reservation.formula || firstParam(params.formule) || "";
  const payment = reservation.paymentType || firstParam(params.paiement) || "";
  const hours = FORMULA_HOURS[formula] || "selon la formule reservee";
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
          {isConfirmed ? "Paiement confirme" : "Paiement non confirme"}
        </p>

        <h1 className="mt-3 text-3xl font-black leading-tight">
          {isConfirmed
            ? "Votre sortie de peche est confirmee"
            : isFailed
            ? "Reservation non finalisee"
            : "Paiement en attente de confirmation"}
        </h1>

        <p className="mt-4 text-base font-semibold leading-7 text-slate-600">
          {isConfirmed
            ? "Merci ! Votre reservation est confirmee uniquement parce que PayZen a confirme le paiement."
            : "Votre retour boutique ne valide pas la reservation. Si le paiement n'a pas ete confirme par PayZen, aucune confirmation definitive n'est envoyee."}
        </p>

        {isConfirmed && (
          <div className="mt-6 bg-cyan-50 p-4 text-left">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
              Votre rendez-vous
            </p>
            <p className="mt-2 text-lg font-black text-cyan-950">
              Depart Marina Taina, Punaauia
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
              Quai principal devant Casa Bianca.
            </p>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
              Horaires : {hours}. Une tolerance de +/- 30 min peut s&apos;appliquer.
            </p>
          </div>
        )}

        {isConfirmed && payment === "deposit" && (
          <div className="mt-4 bg-amber-50 p-4 text-left">
            <p className="text-sm font-bold leading-6 text-amber-950">
              Vous avez regle un acompte. Le solde sera a regler le jour de la
              sortie.
            </p>
          </div>
        )}

        {!isConfirmed && (
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
