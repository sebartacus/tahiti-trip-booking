export default function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.35),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.25),_transparent_35%)]" />

      <div className="relative px-6 py-16 sm:px-10 lg:px-16">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-cyan-200">
          Tahiti Trip Fishing
        </p>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Sortie baleines à Tahiti
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
          Vivez une rencontre exceptionnelle avec les baleines à bosse, dans le
          respect de l’océan, des animaux et de la réglementation polynésienne.
        </p>

        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-white/10 px-4 py-2 backdrop-blur">
            Saison 20 juillet → 20 novembre
          </span>
          <span className="rounded-full bg-white/10 px-4 py-2 backdrop-blur">
            Mise à l’eau limitée à 6 personnes
          </span>
          <span className="rounded-full bg-white/10 px-4 py-2 backdrop-blur">
            Observateurs acceptés
          </span>
        </div>
      </div>
    </section>
  );
}