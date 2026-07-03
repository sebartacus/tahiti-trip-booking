export function BaleinesInfoCards() {
  return (
    <section className="peche-reveal grid gap-4 md:grid-cols-3">
      <article className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(8,145,178,0.12)] md:col-span-2 md:p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-2xl">
          🐋
        </div>
        <h2 className="mt-4 text-2xl font-black text-slate-950">
          Nage avec les baleines
        </h2>
        <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
          Les mises à l&apos;eau sont organisées selon les conditions, le
          comportement des animaux et les consignes de l&apos;équipage.
        </p>
      </article>

      <article className="rounded-3xl border border-cyan-100 bg-cyan-50 p-5 shadow-[0_18px_45px_rgba(8,145,178,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(8,145,178,0.12)] md:p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl">
          ☀️
        </div>
        <h2 className="mt-4 text-2xl font-black text-cyan-950">Météo</h2>
        <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
          En cas de météo défavorable, la sortie peut être reportée selon les
          disponibilités.
        </p>
      </article>
    </section>
  );
}
