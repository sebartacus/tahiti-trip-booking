const species = [
  { name: "Marlin", image: "/images/peche/marlin.jpg" },
  { name: "Thon", image: "/images/peche/thon.jpg" },
  { name: "Mahi-mahi", image: "/images/peche/mahi-mahi.jpg" },
  { name: "Wahoo", image: "/images/peche/wahoo.jpg" },
  { name: "Bonite", image: "/images/peche/bonite.jpg" },
];

export function PecheSpecies() {
  return (
    <section className="peche-reveal space-y-4 rounded-3xl bg-cyan-50 p-5 md:p-7">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
          Espèces recherchées
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">
          Les grands poissons du large
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {species.map((item) => (
          <article
            key={item.name}
            className="group overflow-hidden rounded-2xl border border-cyan-100 bg-white shadow-[0_16px_38px_rgba(8,145,178,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(8,145,178,0.14)]"
          >
            <div
              aria-label={item.name}
              className="relative h-48 bg-cyan-100 bg-cover bg-center transition duration-500 group-hover:scale-[1.03]"
              role="img"
              style={{ backgroundImage: `url('${item.image}')` }}
            >
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-cyan-950/70 to-transparent px-4 pb-4 pt-12">
                <h3 className="text-lg font-black uppercase tracking-[0.12em] text-white">
                  {item.name}
                </h3>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
