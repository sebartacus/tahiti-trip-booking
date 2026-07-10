import type { Metadata } from "next";
import Link from "next/link";
import { FilmHeroBackground } from "@/components/FilmHeroBackground";
import { WhatsAppChannelCard } from "@/components/WhatsAppChannelCard";
import {
  englishRoutes,
  homeTranslations,
  localeHomePaths,
  localeLabels,
} from "@/lib/i18n";

export const metadata: Metadata = {
  title: {
    absolute: "Tahiti Trip | Fishing Charter & Whale Watching in Tahiti",
  },
  description:
    "Private fishing charters, whale watching tours and unforgettable experiences in French Polynesia.",
  alternates: {
    canonical: "/en",
    languages: {
      fr: "https://tahiti-trip.com/",
      en: "https://tahiti-trip.com/en",
      "x-default": "https://tahiti-trip.com/",
    },
  },
  openGraph: {
    title: "Tahiti Trip Fishing | Ocean experiences in Tahiti",
    description:
      "Private sport fishing, whale watching and authentic sea experiences with a local crew.",
    url: "https://tahiti-trip.com/en",
    images: [
      {
        url: "/images/peche/hero.jpg",
        width: 1200,
        height: 630,
        alt: "Tahiti Trip Fishing in Tahiti",
      },
    ],
  },
};

const t = homeTranslations.en;

const experiences = [
  {
    title: t.experiences.fishing.title,
    text: t.experiences.fishing.text,
    href: englishRoutes.fishing,
    image: "/images/peche/marlin.jpg",
  },
  {
    title: t.experiences.whales.title,
    text: t.experiences.whales.text,
    href: englishRoutes.whaleWatching,
    image: "/images/baleines/hero.jpg",
  },
  {
    title: t.experiences.contact.title,
    text: t.experiences.contact.text,
    href: englishRoutes.contact,
    image: "/images/peche/rodman.jpg",
  },
];

const whatsappUrl =
  "https://wa.me/68987321631?text=Ia%20orana%2C%20I%20would%20like%20to%20book%20an%20ocean%20experience%20with%20Tahiti%20Trip%20Fishing.";

export default function EnglishHomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative min-h-screen overflow-hidden bg-cyan-950 text-white">
        <FilmHeroBackground />
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/78 via-cyan-950/28 to-slate-950/18" />

        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-between px-4 py-5">
          <header className="flex items-center justify-between gap-4">
            <Link
              href={englishRoutes.home}
              className="text-sm font-black uppercase tracking-[0.18em] text-white"
            >
              Tahiti Trip Fishing
            </Link>
            <div className="flex items-center gap-2 text-xs font-black md:hidden">
              <Link href={localeHomePaths.fr} className="text-cyan-100/75">
                {localeLabels.fr}
              </Link>
              <Link href={localeHomePaths.en} className="text-white">
                {localeLabels.en}
              </Link>
            </div>
            <nav className="hidden items-center gap-5 text-sm font-bold text-cyan-50 md:flex">
              <Link href={englishRoutes.fishing}>{t.nav.fishing}</Link>
              <Link href={englishRoutes.whaleWatching}>{t.nav.whales}</Link>
              <Link href={englishRoutes.contact}>{t.nav.contact}</Link>
              <span className="flex items-center gap-2 border-l border-white/30 pl-5 text-xs font-black">
                <Link href={localeHomePaths.fr} className="text-cyan-100/75">
                  {localeLabels.fr}
                </Link>
                <Link href={localeHomePaths.en} className="text-white">
                  {localeLabels.en}
                </Link>
              </span>
            </nav>
          </header>

          <div className="max-w-4xl pb-8">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-50">
              {t.hero.badge}
            </p>
            <h1 className="mt-4 text-[2.8rem] font-black leading-[0.95] md:text-7xl">
              {t.hero.title}
            </h1>
            <p className="mt-5 max-w-2xl text-xl font-bold leading-8 text-cyan-50 md:text-2xl md:leading-10">
              {t.hero.subtitle}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="#experiences"
                className="inline-flex min-h-14 items-center justify-center bg-cyan-700 px-6 text-base font-black text-white shadow-[0_14px_28px_rgba(8,145,178,0.22)] transition hover:bg-cyan-600"
              >
                {t.hero.primary}
              </a>
              <Link
                href={englishRoutes.contact}
                className="inline-flex min-h-14 items-center justify-center border border-white/40 bg-white/12 px-6 text-base font-black text-white backdrop-blur transition hover:bg-white/20"
              >
                {t.hero.secondary}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="pt-6">
        <WhatsAppChannelCard locale="en" />
      </div>

      <section className="mx-auto max-w-md px-4 py-10 md:max-w-4xl md:py-14">
        <div className="peche-reveal text-center">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
            {t.intro.eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">
            {t.intro.title}
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base font-bold leading-8 text-slate-700 md:text-lg md:leading-9">
            {t.intro.text}
          </p>
        </div>
      </section>

      <section
        id="experiences"
        className="mx-auto max-w-md space-y-5 px-4 pb-10 md:max-w-6xl md:pb-14"
      >
        <div className="peche-reveal">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
            {t.experiences.eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">
            {t.experiences.title}
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {experiences.map((experience) => (
            <article
              key={experience.title}
              className="peche-reveal flex h-full min-h-[30rem] flex-col overflow-hidden rounded-3xl border border-cyan-100 bg-white shadow-[0_18px_45px_rgba(8,145,178,0.12)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(8,145,178,0.16)]"
            >
              <div
                className="aspect-[4/3] w-full bg-cyan-100 bg-cover bg-center"
                role="img"
                aria-label={experience.title}
                style={{ backgroundImage: `url('${experience.image}')` }}
              />
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-2xl font-black text-slate-950">
                  {experience.title}
                </h3>
                <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
                  {experience.text}
                </p>
                <div className="mt-auto pt-5">
                  <Link
                    href={experience.href}
                    className="inline-flex min-h-12 w-full items-center justify-center bg-cyan-700 px-5 text-sm font-black text-white shadow-[0_14px_28px_rgba(8,145,178,0.22)] transition hover:bg-cyan-600"
                  >
                    {t.experiences.cta}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-cyan-50 py-10 md:py-14">
        <div className="mx-auto max-w-md px-4 md:max-w-6xl">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {t.trust.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-white px-4 py-5 text-sm font-black text-slate-950 shadow-[0_10px_24px_rgba(8,145,178,0.08)]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-md gap-5 px-4 py-10 md:max-w-6xl md:grid-cols-[1fr_0.9fr] md:py-14">
        <article className="peche-reveal rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.08)] md:p-7">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
            Marina Taina
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">
            Punaauia, Tahiti
          </h2>
          <p className="mt-3 text-base font-bold leading-7 text-slate-700">
            Main departure point for Tahiti Trip Fishing experiences.
          </p>
        </article>

        <article className="peche-reveal rounded-3xl border border-cyan-100 bg-cyan-50 p-5 shadow-[0_18px_45px_rgba(8,145,178,0.08)] md:p-7">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
            {t.contact.eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">
            {t.contact.title}
          </h2>
          <div className="mt-5 grid gap-3 text-sm font-bold leading-6 text-slate-700">
            <p>{t.contact.phone}</p>
            <p>{t.contact.email}</p>
            <p>{t.contact.note}</p>
          </div>
          <a
            href={whatsappUrl}
            className="mt-6 inline-flex min-h-14 w-full items-center justify-center bg-[#25D366] px-6 text-base font-black text-white shadow-[0_14px_28px_rgba(37,211,102,0.24)] transition hover:-translate-y-0.5"
          >
            {t.contact.whatsapp}
          </a>
        </article>
      </section>

      <footer className="bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-100">
              TAHITI TRIP
            </p>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-300">
              {t.footer.text}
            </p>
          </div>
          <nav className="grid gap-2 text-sm font-bold text-slate-300">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
              {t.footer.activities}
            </p>
            <Link href={englishRoutes.fishing}>{t.nav.fishing}</Link>
            <Link href={englishRoutes.whaleWatching}>{t.nav.whales}</Link>
            <Link href={englishRoutes.contact}>{t.nav.contact}</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
