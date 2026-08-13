import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { CHARTER_FORMULA_DETAILS, formatXpf } from "@/lib/charter-pricing";
import { isCharterFormula } from "@/lib/charter-availability";

type SearchParams = { reservationId?: string | string[] };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${value}T00:00:00Z`));
}

async function getReservation(id: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !id) return null;
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await supabase.from("reservations_charter")
    .select("date_debut,date_fin,formule,nombre_personnes,montant_paye,montant_solde,statut_paiement,paye")
    .eq("id", id).maybeSingle();
  return result.data;
}

export default async function CharterSuccessPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const reservation = await getReservation(first(params.reservationId));
  const paid = reservation?.paye === true && reservation?.statut_paiement === "paid";
  const failed = reservation?.statut_paiement === "failed" || reservation?.statut_paiement === "cancelled";
  const title = paid ? "PAYMENT CONFIRMED" : failed ? "PAYMENT FAILED / CANCELLED" : "CONFIRMATION IN PROGRESS";
  const formula = reservation && isCharterFormula(reservation.formule)
    ? CHARTER_FORMULA_DETAILS[reservation.formule].label
    : "Charter privé";

  return (
    <main className="min-h-screen bg-cyan-50/50 px-4 py-10 text-slate-950 sm:py-16">
      <section className="mx-auto max-w-xl rounded-[2rem] border border-cyan-100 bg-white p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-10">
        <p className={`text-xs font-black uppercase tracking-[0.18em] ${paid ? "text-teal-700" : failed ? "text-rose-700" : "text-amber-700"}`}>Tahiti Trip Charter</p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-cyan-950 sm:text-4xl">{title}</h1>
        <p className="mt-4 font-semibold leading-7 text-slate-600">
          {paid ? "Merci, votre charter est réservé." : failed ? "Le paiement n’a pas été validé. Aucun charter n’est confirmé." : "Votre paiement est en cours de confirmation."}
        </p>

        {paid && reservation && (
          <div className="mt-7 rounded-2xl bg-cyan-50 p-5 text-left text-sm font-semibold leading-7 text-slate-700">
            <h2 className="text-xl font-black text-cyan-950">{formula}</h2>
            <p className="mt-3"><b>Départ :</b> {dateLabel(String(reservation.date_debut))}</p>
            {reservation.date_fin !== reservation.date_debut && <p><b>Retour :</b> {dateLabel(String(reservation.date_fin))}</p>}
            <p><b>Participants :</b> {reservation.nombre_personnes}</p>
            <p><b>Montant payé :</b> {formatXpf(Number(reservation.montant_paye))}</p>
            {Number(reservation.montant_solde) > 0 && <p><b>Solde restant :</b> {formatXpf(Number(reservation.montant_solde))}</p>}
            <div className="mt-4 border-t border-cyan-200 pt-4">
              <b className="text-cyan-950">Rendez-vous : Marina Taina, Punaauia.</b>
            </div>
          </div>
        )}

        <Link href="/en/charter" className="mt-7 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-teal-700 px-6 font-black text-white sm:w-auto">
          Back to the Charter page
        </Link>
      </section>
    </main>
  );
}

