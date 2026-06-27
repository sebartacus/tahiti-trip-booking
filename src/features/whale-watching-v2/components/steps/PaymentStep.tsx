"use client";

type Props = {
  total: number;
};

export function PaymentStep({ total }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          💳 Paiement
        </h2>

        <p className="mt-2 text-slate-300">
          Vérifiez votre réservation avant de procéder au paiement sécurisé.
        </p>
      </div>

      <div className="rounded-2xl border border-cyan-500/20 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <span className="text-slate-300">
            Montant à payer
          </span>

          <span className="text-3xl font-bold text-cyan-300">
            {new Intl.NumberFormat("fr-FR").format(total)} F CFP
          </span>
        </div>

        <button
          type="button"
          className="mt-8 w-full rounded-xl bg-cyan-500 py-4 text-lg font-bold text-slate-950 transition hover:bg-cyan-400"
        >
          Payer avec PayZen
        </button>

        <p className="mt-4 text-center text-sm text-slate-400">
          Paiement 100 % sécurisé.
        </p>
      </div>
    </div>
  );
}