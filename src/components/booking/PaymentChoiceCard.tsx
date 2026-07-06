type PaymentChoiceCardProps = {
  totalAmount: number;
  depositPercent: number;
  currencyLabel?: string;
  onSelectDeposit: () => void;
  onSelectFullPayment: () => void;
  activityLabel?: string;
  variant?: "default" | "premium";
};

function formatAmount(amount: number, currencyLabel: string) {
  return `${Math.max(0, amount)
    .toLocaleString("fr-FR")
    .replace(/\s/g, " ")} ${currencyLabel}`;
}

export function PaymentChoiceCard({
  totalAmount,
  depositPercent,
  currencyLabel = "F CFP",
  onSelectDeposit,
  onSelectFullPayment,
  activityLabel = "votre sortie",
  variant = "default",
}: PaymentChoiceCardProps) {
  const normalizedPercent = Math.max(0, Math.min(100, depositPercent));
  const depositAmount = Math.round((totalAmount * normalizedPercent) / 100);
  const isPremium = variant === "premium";

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <article
          className={`flex h-full flex-col rounded-[28px] border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.10)] ${
            isPremium ? "transition focus-within:border-cyan-700" : ""
          }`}
        >
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
            {activityLabel}
          </p>
          <h3 className="mt-3 text-2xl font-black leading-tight text-slate-950">
            Réserver avec un acompte
          </h3>
          <p className="mt-3 text-5xl font-black text-cyan-700">
            {normalizedPercent} %
          </p>
          <p className="mt-2 text-xl font-black text-slate-950">
            {formatAmount(depositAmount, currencyLabel)}
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
            Le solde sera réglé le jour de votre sortie.
          </p>
          <button
            type="button"
            onClick={onSelectDeposit}
            className="mt-auto min-h-14 w-full rounded-2xl bg-cyan-700 px-5 text-base font-black text-white shadow-[0_14px_28px_rgba(8,145,178,0.22)] outline-none transition focus:border focus:border-cyan-700 active:ring-4 active:ring-cyan-100"
          >
            Réserver avec acompte
          </button>
        </article>

        <article
          className={`flex h-full flex-col rounded-[28px] border p-5 shadow-[0_18px_45px_rgba(8,145,178,0.10)] ${
            isPremium
              ? "border-cyan-100 bg-white text-slate-950 transition focus-within:border-cyan-700"
              : "border-slate-100 bg-slate-950 text-white"
          }`}
        >
          <p
            className={`text-xs font-black uppercase tracking-[0.16em] ${
              isPremium ? "text-cyan-700" : "text-cyan-200"
            }`}
          >
            Paiement complet
          </p>
          <h3 className="mt-3 text-2xl font-black leading-tight">
            Payer la totalité
          </h3>
          <p className="mt-6 text-4xl font-black">
            {formatAmount(totalAmount, currencyLabel)}
          </p>
          <p
            className={`mt-3 text-sm font-semibold leading-6 ${
              isPremium ? "text-slate-600" : "text-slate-200"
            }`}
          >
            Aucun solde à régler le jour de la sortie.
          </p>
          <button
            type="button"
            onClick={onSelectFullPayment}
            className={`mt-auto min-h-14 w-full rounded-2xl px-5 text-base font-black outline-none transition active:ring-4 active:ring-cyan-100 ${
              isPremium
                ? "bg-cyan-700 text-white shadow-[0_14px_28px_rgba(8,145,178,0.22)] focus:border focus:border-cyan-700"
                : "bg-white text-slate-950"
            }`}
          >
            Payer la totalité
          </button>
        </article>
      </div>

      {!isPremium && (
        <aside className="rounded-[28px] border border-emerald-100 bg-emerald-50 p-5">
          <h3 className="text-xl font-black text-emerald-950">
            Réservez en toute sérénité
          </h3>
          <p className="mt-3 text-sm font-semibold leading-6 text-emerald-900">
            En cas d&apos;annulation liée aux conditions météorologiques :
          </p>
          <ul className="mt-3 space-y-2 text-sm font-bold leading-6 text-emerald-900">
            <li>report gratuit de votre sortie</li>
            <li>ou remboursement de votre paiement</li>
          </ul>
          <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">
            Seuls les frais bancaires liés au paiement sécurisé (3 %) restent à
            la charge du client.
          </p>
        </aside>
      )}
    </section>
  );
}
