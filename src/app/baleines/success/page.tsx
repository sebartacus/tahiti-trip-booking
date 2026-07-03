import Link from "next/link";

export default function BaleinesSuccessPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-10 text-slate-950">
      <section className="mx-auto max-w-md border border-cyan-100 bg-white p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-cyan-700">
          Paiement confirmé
        </p>

        <h1 className="mt-3 text-3xl font-black leading-tight">
          Votre sortie baleines est confirmée
        </h1>

        <p className="mt-4 text-base font-semibold leading-7 text-slate-600">
          Merci ! Votre réservation a bien été enregistrée. Nous avons hâte de
          vous accueillir à bord.
        </p>

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
