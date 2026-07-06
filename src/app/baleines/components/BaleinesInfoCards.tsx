const infoCards = [
  {
    icon: "🐋",
    title: "Observation des baleines",
    text: "Une sortie pensée pour observer les baleines dans leur environnement naturel.",
  },
  {
    icon: "🤿",
    title: "Mise à l'eau encadrée",
    text: "Les mises à l'eau sont guidées par l'équipage selon les conditions du jour.",
  },
  {
    icon: "👨‍👩‍👧",
    title: "Petit comité",
    text: "Un format limité pour garder une expérience confortable et attentive.",
  },
  {
    icon: "🌿",
    title: "Approche respectueuse",
    text: "Les observations se font avec patience, distance et respect des animaux.",
  },
  {
    icon: "📷",
    title: "Photos souvenirs",
    text: "Des instants forts à partager après votre sortie en mer.",
  },
  {
    icon: "🚤",
    title: "Bateau confortable",
    text: "Un bateau adapté aux sorties baleines au départ de la Marina Taina.",
  },
];

export function BaleinesInfoCards() {
  return (
    <section className="peche-reveal grid gap-4 md:grid-cols-3">
      {infoCards.map((card) => (
        <article
          key={card.title}
          className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(8,145,178,0.12)] md:p-7"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-2xl">
            {card.icon}
          </div>
          <h2 className="mt-4 text-2xl font-black text-slate-950">
            {card.title}
          </h2>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
            {card.text}
          </p>
        </article>
      ))}
    </section>
  );
}
