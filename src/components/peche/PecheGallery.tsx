const galleryImages = [
  {
    src: "/images/peche/hero.jpg",
    title: "Départ",
  },
  {
    src: "/images/peche/rodman.jpg",
    title: "Au large",
  },
  {
    src: "/images/peche/combat.jpg",
    title: "Combat",
  },
  {
    src: "/images/peche/marlin.jpg",
    title: "Capture",
  },
  {
    src: "/images/peche/thon.jpg",
    title: "Retour",
  },
  {
    src: "/images/peche/clients.jpg",
    title: "Clients",
  },
];

export function PecheGallery() {
  return (
    <section className="peche-reveal space-y-4">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
          Photos
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">
          Une journée en mer
        </h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {galleryImages.map((image, index) => (
          <figure
            key={image.src}
            className={`overflow-hidden rounded-3xl border border-cyan-100 bg-white shadow-[0_18px_45px_rgba(8,145,178,0.12)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(8,145,178,0.16)] ${
              index === 0 || index === 3 ? "md:col-span-2" : ""
            }`}
          >
            <div
              aria-label={image.title}
              className={`bg-cover bg-center ${
                index === 0 || index === 3
                  ? "min-h-[24rem] md:min-h-[34rem]"
                  : "min-h-72 md:min-h-80"
              }`}
              role="img"
              style={{ backgroundImage: `url('${image.src}')` }}
            />
            <figcaption className="bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-cyan-700">
              {image.title}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
