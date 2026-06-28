import Image from "next/image";

export function BaleinesHero() {
  return (
    <header className="bg-white px-4 pt-4">
      <div className="mx-auto max-w-md overflow-hidden rounded-[30px] border border-cyan-100 bg-white shadow-[0_18px_45px_rgba(8,145,178,0.12)] md:max-w-5xl">
        <div className="relative h-[172px] bg-cyan-50 md:h-[240px]">
          <Image
            src="/images/baleines/hero.jpg"
            alt="Observation des baleines a Tahiti"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 960px"
            className="object-cover"
          />
        </div>

        <div className="space-y-4 p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
              Tahiti Trip Fishing
            </p>
            <h1 className="mt-2 text-[1.9rem] font-black leading-[1.05] text-slate-950">
              Observation des baleines a Tahiti
            </h1>
            <p className="mt-3 text-base font-semibold leading-6 text-slate-600">
              Sortie en petit comite, sans rotation des nageurs.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-cyan-100 bg-cyan-50 px-4 py-3">
              <p className="text-2xl font-black text-cyan-950">6</p>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-800">
                Nageurs max
              </p>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-2xl font-black text-blue-950">2</p>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-800">
                Observateurs max
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
