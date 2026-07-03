import Image from "next/image";

export function BaleinesHero() {
  return (
    <header className="relative min-h-[86svh] overflow-hidden bg-cyan-50 text-white">
      <Image
        src="/images/baleines/hero.jpg"
        alt="Observation des baleines à Tahiti"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/50 via-cyan-900/12 to-white/0" />

      <div className="relative mx-auto flex min-h-[86svh] max-w-5xl flex-col justify-end px-4 pb-5 pt-24 md:pb-6">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-cyan-50">
          Tahiti Trip Fishing
        </p>
        <h1 className="mt-3 max-w-xl text-[2.1rem] font-black leading-[0.98] md:text-5xl">
          Observation des baleines à Tahiti
        </h1>
        <p className="mt-4 max-w-xl text-xl font-bold leading-8 text-cyan-50">
          Nage avec les baleines en petit comité.
        </p>

        <div className="mt-5 grid max-w-sm grid-cols-2 gap-3">
          <div className="border border-white/20 bg-white/90 px-4 py-3 text-cyan-950 shadow-[0_18px_45px_rgba(8,145,178,0.12)] backdrop-blur">
            <p className="text-2xl font-black">6</p>
            <p className="text-xs font-black uppercase tracking-[0.12em]">
              Nageurs max
            </p>
          </div>

          <div className="border border-white/20 bg-white/90 px-4 py-3 text-cyan-950 shadow-[0_18px_45px_rgba(8,145,178,0.12)] backdrop-blur">
            <p className="text-2xl font-black">2</p>
            <p className="text-xs font-black uppercase tracking-[0.12em]">
              Observateurs max
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
