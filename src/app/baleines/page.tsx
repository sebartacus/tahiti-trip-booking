import Image from "next/image";
import PageBaleinesExisting from "./page-sauvegarde";

export default function BaleinesPage() {
  return (
    <div className="bg-gradient-to-b from-sky-50 to-white">
      <section className="px-4 pt-5">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[32px] border border-cyan-100 bg-white shadow-[0_22px_70px_rgba(14,116,144,0.14)]">
          <div className="relative h-[170px] overflow-hidden bg-cyan-50 md:h-[280px]">
            <Image
              src="/images/baleines/hero.jpg"
              alt="Observation des baleines a Tahiti"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 1152px"
              className="object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/90" />
          </div>

          <div className="p-5 md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
              Tahiti Trip Booking
            </p>

            <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950 md:text-5xl">
              Observation des baleines à Tahiti
            </h1>

            <p className="mt-3 max-w-2xl text-base font-semibold leading-relaxed text-slate-600 md:text-lg">
              Sortie en petit comité, sans rotation des nageurs.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
                <p className="text-2xl font-black text-slate-950">🤿 6</p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-cyan-800">
                  Nageurs max
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-2xl font-black text-slate-950">👀 2</p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-800">
                  Observateurs max
                </p>
              </div>

              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <p className="text-lg font-black text-slate-950">⏱ 2 départs</p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-sky-800">
                  7h00 et 13h15
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="[&>main]:min-h-0 [&>main>section:first-child]:hidden [&_input[type='date']]:min-h-14 [&_input[type='date']]:touch-manipulation [&_input[type='date']]:appearance-none [&_input[type='date']]:bg-white [&_input[type='date']]:text-base [&_input[type='date']]:font-semibold">
        <PageBaleinesExisting />
      </div>
    </div>
  );
}
