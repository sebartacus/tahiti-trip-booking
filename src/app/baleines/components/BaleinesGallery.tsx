import type { WhaleWatchingTranslations } from "@/lib/i18n";
import { whaleWatchingTranslations } from "@/lib/i18n";

const galleryImages = [
  {
    src: "/images/baleines/hero-baleine-saut.jpg",
    position: "center",
  },
  {
    src: "/images/baleines/baleine-sous-eau.jpg",
    position: "center",
  },
  {
    src: "/images/baleines/galerie-baleine-queue.jpg",
    position: "center",
  },
  {
    src: "/images/baleines/navigation.jpg",
    position: "center",
  },
  {
    src: "/images/baleines/tete.jpg",
    position: "center",
  },
  {
    src: "/images/baleines/galerie-bateau-drone-2.jpg",
    position: "center",
  },
];

type BaleinesGalleryProps = {
  t?: WhaleWatchingTranslations;
};

export function BaleinesGallery({
  t = whaleWatchingTranslations.fr,
}: BaleinesGalleryProps) {
  return (
    <section className="peche-reveal space-y-4">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
          {t.gallery.eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">
          {t.gallery.title}
        </h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {galleryImages.map((image, index) => {
          const title = t.gallery.images[index] || "";

          return (
            <figure
              key={image.src}
              className={`overflow-hidden rounded-3xl border border-cyan-100 bg-white shadow-[0_18px_45px_rgba(8,145,178,0.12)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(8,145,178,0.16)] ${
                index === 0 || index === 3 ? "md:col-span-2" : ""
              }`}
            >
              <div
                aria-label={title}
                className={`bg-cover ${
                  index === 0 || index === 3
                    ? "min-h-[24rem] md:min-h-[34rem]"
                    : "min-h-72 md:min-h-80"
                }`}
                role="img"
                style={{
                  backgroundImage: `url('${image.src}')`,
                  backgroundPosition: image.position,
                }}
              />
              <figcaption className="bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-cyan-700">
                {title}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
