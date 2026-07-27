import Link from "next/link";
import { supabase } from "@/lib/supabase";

type SuccessSearchParams = {
  carnetId?: string | string[];
  vads_order_id?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CarnetBaleinesSuccessPage({
  searchParams,
}: {
  searchParams?: Promise<SuccessSearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const carnetId =
    firstParam(params.carnetId) || firstParam(params.vads_order_id) || "";
  const response = carnetId
    ? await supabase
        .from("carnets_baleines")
        .select(
          "code,type_carnet,credits_restants,date_expiration,statut,paiement_effectue"
        )
        .eq("id", carnetId)
        .maybeSingle()
    : { data: null };
  const carnet = response.data;
  const isConfirmed =
    carnet?.paiement_effectue === true && carnet?.statut === "actif";

  return (
    <main className="min-h-screen bg-cyan-50 px-4 py-12 text-slate-950 sm:py-20">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-[32px] border border-cyan-100 bg-white shadow-[0_24px_60px_rgba(8,145,178,0.14)]">
        <div
          className={`px-6 py-8 text-center sm:px-10 ${
            isConfirmed
              ? "bg-cyan-950 text-white"
              : "bg-amber-50 text-amber-950"
          }`}
        >
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl font-black ${
              isConfirmed
                ? "bg-white text-cyan-800"
                : "bg-amber-200 text-amber-900"
            }`}
          >
            {isConfirmed ? "✓" : "!"}
          </div>
          <p className="mt-6 text-sm font-black uppercase tracking-[0.18em]">
            Tahiti Trip Fishing
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            {isConfirmed ? "CARNET CONFIRMÉ" : "PAIEMENT NON CONFIRMÉ"}
          </h1>
          <p className="mx-auto mt-4 max-w-lg font-semibold leading-7 opacity-90">
            {isConfirmed
              ? "Merci ! Votre Carnet Baleines est actif et prêt à être utilisé."
              : "Votre carnet n’a pas été activé, car le paiement n’a pas encore été confirmé par PayZen."}
          </p>
        </div>

        <div className="p-6 sm:p-10">
          {isConfirmed && carnet ? (
            <>
              <div className="rounded-3xl bg-cyan-50 p-6">
                <p className="text-sm font-black uppercase tracking-wide text-cyan-700">
                  Carnet {carnet.type_carnet} sorties
                </p>
                <p className="mt-5 text-sm font-bold text-slate-600">
                  Votre code
                </p>
                <p className="mt-1 break-all text-3xl font-black tracking-wide text-cyan-950">
                  {carnet.code}
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-sm font-bold text-slate-500">
                      Crédits disponibles
                    </p>
                    <p className="mt-1 text-2xl font-black">
                      {carnet.credits_restants}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-sm font-bold text-slate-500">
                      Date de validité
                    </p>
                    <p className="mt-1 font-black">20 novembre 2026</p>
                  </div>
                </div>
              </div>
              <p className="mt-6 text-center text-sm font-semibold leading-6 text-slate-600">
                Conservez votre code. Il vous sera demandé lorsque vous
                choisirez le paiement par Carnet Baleines.
              </p>
            </>
          ) : (
            <div className="rounded-2xl bg-amber-50 p-5 text-sm font-semibold leading-6 text-amber-950">
              Si vous pensez avoir été débité, patientez quelques instants puis
              rechargez cette page, ou contactez Tahiti Trip Fishing.
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {isConfirmed && (
              <Link
                href="/baleines"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-cyan-700 px-6 font-black text-white"
              >
                Réserver une sortie Baleines
              </Link>
            )}
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 px-6 font-black"
            >
              Retour à l’accueil
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
