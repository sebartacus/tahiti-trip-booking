"use client";

import Image from "next/image";

export function Header() {
  return (
    <header className="overflow-hidden rounded-[30px] border border-cyan-100 bg-white shadow-[0_18px_45px_rgba(14,116,144,0.12)]">
      <div className="relative h-[160px] overflow-hidden bg-cyan-50 sm:h-[180px]">
        <Image
          src="/images/baleines/hero.jpg"
          alt="Observation des baleines a Tahiti"
          fill
          priority
          sizes="(max-width: 640px) 100vw, 460px"
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/85" />
      </div>

      <div className="space-y-4 p-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-700">
            Whale Watching
          </p>

          <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950">
            Observation des baleines à Tahiti
          </h1>

          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
            Sortie en petit comité, sans rotation des nageurs.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-3">
            <p className="text-xl font-black leading-none text-slate-950">
              6
            </p>

            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-800">
              Nageurs max
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
            <p className="text-xl font-black leading-none text-slate-950">
              2
            </p>

            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-800">
              Observateurs
            </p>
          </div>

          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3">
            <p className="text-sm font-black leading-none text-slate-950">
              20 juil.
            </p>

            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-sky-800">
              Au 20 nov.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-600">
          Saison 20 juillet &rarr; 20 novembre
        </div>
      </div>
    </header>
  );
}
