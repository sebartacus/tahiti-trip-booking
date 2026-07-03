import { WhatsAppButton } from "./WhatsAppButton";

export function PecheInfoCards() {
  return (
    <>
      <section className="peche-reveal grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(8,145,178,0.12)] md:col-span-2 md:p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-2xl">
            🐟
          </div>
          <h2 className="mt-4 text-2xl font-black text-slate-950">
            Poisson et déjeuner
          </h2>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
            Les clients repartent avec une partie du poisson, ou la totalité en
            cas de petites pièces.
          </p>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
            Pour la journée complète, le déjeuner est servi sous forme de
            sandwich : charcuterie, sushis sauf dimanche/lundi, poulet fumé et
            fromage.
          </p>
        </article>

        <article className="rounded-3xl border border-cyan-100 bg-cyan-50 p-5 shadow-[0_18px_45px_rgba(8,145,178,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(8,145,178,0.12)] md:p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl">
            🌴
          </div>
          <h2 className="mt-4 text-2xl font-black text-cyan-950">Moorea</h2>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
            Départ possible depuis Moorea sur demande, avec supplément
            carburant.
          </p>
          <div className="mt-4">
            <WhatsAppButton />
          </div>
        </article>
      </section>

      <section className="peche-reveal rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(8,145,178,0.12)] md:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-2xl">
            ☀️
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-950">Météo</h2>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
              Report gratuit ou remboursement en cas d&apos;annulation météo.
              Seuls les frais bancaires liés au paiement sécurisé (3 %) restent
              à la charge du client.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
