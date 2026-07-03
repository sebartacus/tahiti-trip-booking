import Link from "next/link";

type SuccessSearchParams = {
  formule?: string | string[];
  paiement?: string | string[];
};

const FORMULA_HOURS: Record<string, string> = {
  morning: "07h15 - 12h00",
  afternoon: "13h15 - 17h45",
  full_day: "07h15 - 15h45",
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PecheSuccessPage({
  searchParams,
}: {
  searchParams?: Promise<SuccessSearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const formula = firstParam(params.formule) || "";
  const payment = firstParam(params.paiement) || "";
  const hours = FORMULA_HOURS[formula] || "selon la formule réservée";

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-slate-950">
      <section className="mx-auto max-w-md border border-cyan-100 bg-white p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-cyan-700">
          Paiement confirmé
        </p>

        <h1 className="mt-3 text-3xl font-black leading-tight">
          Votre sortie de pêche est confirmée
        </h1>

        <p className="mt-4 text-base font-semibold leading-7 text-slate-600">
          Merci ! Votre réservation a bien été enregistrée. Nous avons hâte de
          vous accueillir à bord de l&apos;Olphi Nui.
        </p>

        <div className="mt-6 bg-cyan-50 p-4 text-left">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
            Votre rendez-vous
          </p>
          <p className="mt-2 text-lg font-black text-cyan-950">
            Départ Marina Taina, Punaauia
          </p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
            Quai principal devant Casa Bianca.
          </p>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
            Horaires : {hours}. Une tolérance de +/- 30 min peut s&apos;appliquer.
          </p>
        </div>

        {payment === "deposit" && (
          <div className="mt-4 bg-amber-50 p-4 text-left">
            <p className="text-sm font-bold leading-6 text-amber-950">
              Vous avez réglé un acompte. Le solde sera à régler le jour de la
              sortie.
            </p>
          </div>
        )}

        <Link
          href="/"
          className="mt-6 inline-flex min-h-14 items-center justify-center bg-cyan-700 px-6 text-base font-black text-white"
        >
          Retour à l&apos;accueil
        </Link>
      </section>
    </main>
  );
}
