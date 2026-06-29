import Link from "next/link";

export default function BaleinesSuccessPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-10 text-slate-950">
      <section className="mx-auto max-w-md rounded-[30px] border border-cyan-100 bg-white p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-cyan-700">
          Paiement confirme
        </p>

        <h1 className="mt-3 text-3xl font-black leading-tight">
          Reservation Baleines confirmee
        </h1>

        <p className="mt-4 text-base font-semibold leading-7 text-slate-600">
          Merci, votre paiement a bien ete pris en compte.
        </p>

        <div className="mt-6 rounded-[24px] bg-cyan-50 p-4 text-left">
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
          className="mt-6 inline-flex min-h-14 items-center justify-center rounded-2xl bg-cyan-700 px-6 text-base font-black text-white"
        >
          Retour a l accueil
        </Link>
      </section>
    </main>
  );
}
