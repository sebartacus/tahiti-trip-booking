import type { WhaleWatchingTranslations } from "@/lib/i18n";
import { whaleWatchingTranslations } from "@/lib/i18n";

const heroImage = "/images/baleines/hero.jpg";

type BaleinesHeroProps = {
  t?: WhaleWatchingTranslations;
};

export function BaleinesHero({
  t = whaleWatchingTranslations.fr,
}: BaleinesHeroProps) {
  return (
    <section className="relative min-h-[86svh] overflow-hidden bg-cyan-50 text-white">
      <div
        aria-label={t.hero.imageAlt}
        className="absolute inset-0 bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url('${heroImage}')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/36 via-cyan-900/8 to-white/0" />
      <div className="relative mx-auto flex min-h-[86svh] max-w-5xl flex-col justify-end px-4 pb-5 pt-24 md:pb-6">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-cyan-50">
          Tahiti Trip Fishing
        </p>
        <h1 className="mt-3 max-w-xl text-[2.1rem] font-black leading-[0.98] md:text-5xl">
          {t.hero.title}
        </h1>
        <p className="mt-4 max-w-xl text-xl font-bold leading-8 text-cyan-50">
          {t.hero.subtitle}
        </p>
        <p className="mt-2 max-w-xl text-base font-black uppercase tracking-[0.14em] text-cyan-50">
          {t.hero.note}
        </p>
      </div>
    </section>
  );
}
