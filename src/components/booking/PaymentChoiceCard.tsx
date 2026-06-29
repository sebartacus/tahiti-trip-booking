type PaymentChoiceCardProps = {
  totalAmount: number;
  depositPercent: number;
  currencyLabel?: string;
  onSelectDeposit: () => void;
  onSelectFullPayment: () => void;
  activityLabel?: string;
};

function formatAmount(amount: number, currencyLabel: string) {
  return `${Math.max(0, amount).toLocaleString("fr-FR")} ${currencyLabel}`;
}

export function PaymentChoiceCard({
  totalAmount,
  depositPercent,
  currencyLabel = "F CFP",
  onSelectDeposit,
  onSelectFullPayment,
  activityLabel = "votre sortie",
}: PaymentChoiceCardProps) {
  const normalizedPercent = Math.max(0, Math.min(100, depositPercent));
  const depositAmount = Math.round((totalAmount * normalizedPercent) / 100);

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-[28px] border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
            {activityLabel}
          </p>
          <h3 className="mt-3 text-2xl font-black leading-tight text-slate-950">
            Reserver avec un acompte
          </h3>
          <p className="mt-3 text-5xl font-black text-cyan-700">
            {normalizedPercent} %
          </p>
          <p className="mt-2 text-xl font-black text-slate-950">
            {formatAmount(depositAmount, currencyLabel)}
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
            Le solde sera regle le jour de votre sortie.
          </p>
          <button
            type="button"
            onClick={onSelectDeposit}
            className="mt-5 min-h-14 w-full rounded-2xl bg-cyan-700 px-5 text-base font-black text-white shadow-[0_14px_28px_rgba(8,145,178,0.22)]"
          >
            Reserver avec acompte
          </button>
        </article>

        <article className="rounded-[28px] border border-slate-100 bg-slate-950 p-5 text-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
            Paiement complet
          </p>
          <h3 className="mt-3 text-2xl font-black leading-tight">
            Payer la totalite
          </h3>
          <p className="mt-6 text-4xl font-black">
            {formatAmount(totalAmount, currencyLabel)}
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-200">
            Aucun solde a regler le jour de la sortie.
          </p>
          <button
            type="button"
            onClick={onSelectFullPayment}
            className="mt-5 min-h-14 w-full rounded-2xl bg-white px-5 text-base font-black text-slate-950"
          >
            Payer la totalite
          </button>
        </article>
      </div>

      <aside className="rounded-[28px] border border-emerald-100 bg-emerald-50 p-5">
        <h3 className="text-xl font-black text-emerald-950">
          Reservez en toute serenite
        </h3>
        <p className="mt-3 text-sm font-semibold leading-6 text-emerald-900">
          En cas d&apos;annulation liee aux conditions meteorologiques :
        </p>
        <ul className="mt-3 space-y-2 text-sm font-bold leading-6 text-emerald-900">
          <li>report gratuit de votre sortie</li>
          <li>ou remboursement de votre paiement</li>
        </ul>
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">
          Seuls les frais bancaires lies au paiement securise (3 %) restent a
          la charge du client.
        </p>
      </aside>
    </section>
  );
}
