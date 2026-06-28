"use client";

import Image from "next/image";

export function Header() {
  return (
    <header className="relative overflow-hidden rounded-[34px] bg-slate-950 shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
      <Image
        src="/images/baleines/hero.jpg"
        alt="Observation des baleines a Tahiti"
        width={900}
        height={520}
        priority
        className="h-64 w-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/20 to-slate-950/95" />

      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <Image
          src="/images/baleines/logo-ttf.png"
          alt="Tahiti Trip Fishing"
          width={220}
          height={120}
          className="mb-5 w-32"
        />

        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/85">
          Observation des baleines
        </p>

        <h1 className="mt-2 text-4xl font-black leading-none">
          Tahiti
        </h1>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/12 p-3 backdrop-blur">
            <p className="text-lg font-black">6</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-50/75">
              Nageurs max
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/12 p-3 backdrop-blur">
            <p className="text-lg font-black">20 Jul</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-50/75">
              Saison 2026
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
