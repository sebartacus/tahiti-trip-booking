import type { WhaleWatchingTranslations } from "@/lib/i18n";
import { whaleWatchingTranslations } from "@/lib/i18n";

type BaleinesIntroProps = {
  t?: WhaleWatchingTranslations;
};

export function BaleinesIntro({
  t = whaleWatchingTranslations.fr,
}: BaleinesIntroProps) {
  return (
    <section className="peche-reveal mx-auto max-w-3xl px-2 text-center">
      <p className="text-xl font-semibold leading-9 text-slate-700 md:text-2xl md:leading-10">
        {t.intro}
      </p>
    </section>
  );
}
