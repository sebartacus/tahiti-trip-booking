export function PecheHighlights() {
  const highlights = [
    { icon: "🚤", title: "Bateau privatisé", text: "Rodman 900 Olphi Nui" },
    { icon: "👥", title: "Jusqu'à 4 personnes", text: "Confort optimal" },
    { icon: "🎣", title: "Matériel professionnel", text: "Prêt à pêcher" },
    { icon: "🌍", title: "Français / Anglais", text: "Accueil bilingue" },
  ];

  return (
    <section className="peche-reveal space-y-4 rounded-3xl bg-cyan-50 p-5 md:p-7">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
          Pourquoi nous choisir
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">
          Une sortie privée, simple et soignée
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-[0_16px_38px_rgba(8,145,178,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(8,145,178,0.14)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-2xl">
              {item.icon}
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-950">
              {item.title}
            </h3>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
              {item.text}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
