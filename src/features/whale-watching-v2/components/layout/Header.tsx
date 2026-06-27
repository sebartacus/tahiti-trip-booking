"use client";

export function Header() {
  return (
    <header className="relative mb-10 overflow-hidden rounded-[42px] bg-slate-950 shadow-2xl">
      <img
        src="/images/baleines/hero.jpg"
        alt="Whale Watching Tahiti"
        className="h-[520px] w-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/35 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950/80 to-transparent" />

      <div className="absolute inset-0 flex flex-col justify-end p-8 sm:p-12">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full bg-cyan-400 px-5 py-2 text-sm font-black uppercase tracking-[0.25em] text-slate-950 shadow-lg">
            Tahiti Trip Fishing
          </span>

          <h1 className="mt-6 text-5xl font-black leading-none text-white sm:text-7xl">
            Whale Watching
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-100 sm:text-2xl">
            Réservez votre sortie baleines en Polynésie avec un assistant simple,
            rapide et pensé pour mobile.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/90 px-5 py-3 text-sm font-bold text-slate-900">
              🥽 6 mises à l'eau max
            </span>

            <span className="rounded-full bg-white/90 px-5 py-3 text-sm font-bold text-slate-900">
              🔭 2 observateurs max
            </span>

            <span className="rounded-full bg-white/90 px-5 py-3 text-sm font-bold text-slate-900">
              📅 20 juillet → 20 novembre
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}