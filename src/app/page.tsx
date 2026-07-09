import Link from "next/link";
import type { Metadata } from "next";
import { FilmHeroBackground } from "@/components/FilmHeroBackground";

export const metadata: Metadata = {
  title: "Tahiti Trip Fishing | Pêche, baleines et permis bateau à Tahiti",
  description:
    "Réservez vos sorties pêche au gros, observation des baleines et formations permis bateau avec Tahiti Trip Fishing au départ de Tahiti.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Tahiti Trip Fishing | Expériences en mer à Tahiti",
    description:
      "Pêche au gros, observation des baleines, sorties privées et permis bateau à Tahiti.",
    url: "https://tahiti-trip.com",
    images: [
      {
        url: "/images/peche/hero.jpg",
        width: 1200,
        height: 630,
        alt: "Sortie en mer avec Tahiti Trip Fishing",
      },
    ],
  },
};

const whatsappUrl =
  "https://wa.me/68987321631?text=Ia%20orana%2C%20je%20souhaite%20r%C3%A9server%20une%20exp%C3%A9rience%20avec%20Tahiti%20Trip%20Fishing.";

const experiences = [
  {
    icon: "🐋",
    title: "Observation des baleines",
    text: "Une sortie en petit comité pour observer les baleines dans les meilleures conditions.",
    href: "/baleines",
    image: "/images/baleines/hero.jpg",
  },
  {
    icon: "🎣",
    title: "Pêche au gros",
    text: "Sortie privée au large de Tahiti, matériel professionnel et équipage passionné.",
    href: "/peche",
    image: "/images/peche/marlin.jpg",
  },
  {
    icon: "⚓",
    title: "Permis côtier",
    text: "Formation permis côtier à Tahiti, accompagnement clair et suivi des documents.",
    href: "/permis",
    image: "/images/peche/rodman.jpg",
  },
];

const reasons = [
  ["✔", "Petit comité"],
  ["✔", "Équipage expérimenté"],
  ["✔", "Paiement sécurisé"],
  ["✔", "Départ Marina Taina"],
  ["✔", "WhatsApp rapide"],
  ["✔", "Matériel fourni"],
];

const trustItems = [
  ["🐋", "Opérateur autorisé"],
  ["👥", "Petits groupes"],
  ["💳", "Paiement sécurisé"],
  ["⭐", "Expériences authentiques"],
];

const gallery = [
  { src: "/images/peche/hero.jpg", label: "Pêche au large" },
  { src: "/images/baleines/baleine-sous-eau.jpg", label: "Baleines" },
  { src: "/images/peche/combat.jpg", label: "Combat" },
  { src: "/images/baleines/navigation.jpg", label: "Navigation" },
  { src: "/images/peche/clients.jpg", label: "Clients" },
  { src: "/images/baleines/hero.jpg", label: "Départ" },
];

const reviews = [
  {
    name: "Avis Google",
    text: "Une expérience mémorable, une équipe attentive et une organisation très professionnelle.",
  },
  {
    name: "Avis Google",
    text: "Sortie superbe au départ de la Marina Taina. Réservation simple et accueil chaleureux.",
  },
  {
    name: "Avis Google",
    text: "Une journée incroyable à Tahiti, avec des conseils clairs et un vrai sens du service.",
  },
];

type HomeSearchParams = {
  film?: string | string[];
  theme?: string | string[];
};

const defaultHero = {
  badge: "Tahiti Trip Fishing",
  title: "Découvrez Tahiti autrement",
  subtitle:
    "Pêche au gros, observation des baleines et permis côtier avec une équipe locale passionnée.",
  primaryHref: "#experiences",
  primaryLabel: "Réserver maintenant",
  secondaryHref: "/contact",
  secondaryLabel: "Nous contacter",
  quickInfos: [] as string[],
};

const whaleHero = {
  badge: "Observation des baleines",
  title: "Vivez une rencontre inoubliable avec les baleines de Tahiti",
  subtitle:
    "Partez à la rencontre des majestueuses baleines à bosse dans leur environnement naturel, dans le respect des animaux et en petit comité.",
  primaryHref: "/baleines",
  primaryLabel: "Je réserve maintenant",
  secondaryHref: whatsappUrl,
  secondaryLabel: "WhatsApp",
  quickInfos: [
    "Petit comité",
    "6 nageurs max",
    "2 observateurs max",
    "Saison : juillet à novembre",
    "Départ : Marina Taina",
  ],
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<HomeSearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const film = firstParam(params.film);
  const theme = firstParam(params.theme);
  const isWhaleTheme = theme === "baleines";
  const hero = isWhaleTheme ? whaleHero : defaultHero;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "TouristTrip"],
    name: "Tahiti Trip Fishing",
    url: "https://tahiti-trip.com",
    telephone: "+68987321631",
    email: "contact@tahiti-trip.com",
    image: "https://tahiti-trip.com/images/peche/hero.jpg",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Punaauia",
      addressRegion: "Tahiti",
      addressCountry: "PF",
    },
    areaServed: "Tahiti, Polynésie française",
    touristType: ["Pêche au gros", "Observation des baleines", "Permis bateau"],
  };

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <section className="relative min-h-screen overflow-hidden bg-cyan-950 text-white">
        {isWhaleTheme ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            role="img"
            aria-label="Baleine sous l'eau à Tahiti"
            style={{
              backgroundImage:
                "url('/images/baleines/baleine-sous-eau.jpg')",
            }}
          />
        ) : (
          <FilmHeroBackground film={film} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/78 via-cyan-950/28 to-slate-950/18" />

        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-between px-4 py-5">
          <header className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="text-sm font-black uppercase tracking-[0.18em] text-white"
            >
              Tahiti Trip Fishing
            </Link>
            <nav className="hidden items-center gap-5 text-sm font-bold text-cyan-50 md:flex">
              <Link href="/peche">Pêche</Link>
              <Link href="/baleines">Baleines</Link>
              <Link href="/permis">Permis</Link>
              <Link href="/contact">Contact</Link>
            </nav>
          </header>

          <div className="max-w-4xl pb-8">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-50">
              {hero.badge}
            </p>
            <h1 className="mt-4 text-[2.8rem] font-black leading-[0.95] md:text-7xl">
              {hero.title}
            </h1>
            <p className="mt-5 max-w-2xl text-xl font-bold leading-8 text-cyan-50 md:text-2xl md:leading-10">
              {hero.subtitle}
            </p>
            {hero.quickInfos.length > 0 ? (
              <div className="mt-6 flex max-w-3xl flex-wrap gap-2">
                {hero.quickInfos.map((info) => (
                  <span
                    key={info}
                    className="inline-flex min-h-10 items-center border border-white/30 bg-white/14 px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)] backdrop-blur"
                  >
                    {info}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href={hero.primaryHref}
                className="inline-flex min-h-14 items-center justify-center bg-cyan-700 px-6 text-base font-black text-white shadow-[0_14px_28px_rgba(8,145,178,0.22)] transition hover:bg-cyan-600"
              >
                {hero.primaryLabel}
              </a>
              <a
                href={hero.secondaryHref}
                className="inline-flex min-h-14 items-center justify-center border border-white/40 bg-white/12 px-6 text-base font-black text-white backdrop-blur transition hover:bg-white/20"
              >
                {hero.secondaryLabel}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-md px-4 py-10 md:max-w-4xl md:py-14">
        <div className="peche-reveal text-center">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
            Tahiti Trip
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">
            Découvrez Tahiti autrement
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base font-bold leading-8 text-slate-700 md:text-lg md:leading-9">
            De la pêche au gros à la nage avec les baleines, en passant par les
            excursions privées, les charters et la formation au permis côtier,
            Tahiti Trip vous propose des expériences authentiques en Polynésie
            française.
          </p>
        </div>
      </section>

      <section
        id="experiences"
        className="mx-auto max-w-md space-y-5 px-4 pb-10 md:max-w-6xl md:pb-14"
      >
        <div className="peche-reveal">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
            Nos expériences
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">
            Choisissez votre aventure
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {experiences.map((experience) => (
            <article
              key={experience.title}
              className="peche-reveal flex h-full min-h-[34rem] flex-col overflow-hidden rounded-3xl border border-cyan-100 bg-white shadow-[0_18px_45px_rgba(8,145,178,0.12)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(8,145,178,0.16)]"
            >
              <div
                className="aspect-[4/3] w-full bg-cyan-100 bg-cover bg-center"
                role="img"
                aria-label={experience.title}
                style={{ backgroundImage: `url('${experience.image}')` }}
              />
              <div className="flex flex-1 flex-col p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-2xl">
                  {experience.icon}
                </div>
                <h3 className="mt-4 text-2xl font-black text-slate-950">
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
                    Découvrir
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="peche-reveal grid gap-3 rounded-3xl border border-cyan-100 bg-cyan-50 p-4 shadow-[0_16px_38px_rgba(8,145,178,0.08)] sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map(([icon, label]) => (
            <div
              key={label}
              className="flex min-h-16 items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-[0_10px_24px_rgba(8,145,178,0.08)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-xl">
                {icon}
              </span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-cyan-50 py-10 md:py-14">
        <div className="mx-auto max-w-md px-4 md:max-w-6xl">
          <div className="peche-reveal">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
              Pourquoi nous choisir
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">
              Une équipe locale, simple et fiable
            </h2>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reasons.map(([icon, reason]) => (
              <article
                key={reason}
                className="peche-reveal rounded-2xl border border-cyan-100 bg-white p-5 shadow-[0_16px_38px_rgba(8,145,178,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(8,145,178,0.14)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-xl text-cyan-700">
                  {icon}
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-950">
                  {reason}
                </h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-md space-y-5 px-4 py-10 md:max-w-6xl md:py-14">
        <div className="peche-reveal">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
            Galerie
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">
            Tahiti en mer
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {gallery.map((item, index) => (
            <figure
              key={item.src}
              className={`peche-reveal overflow-hidden rounded-3xl border border-cyan-100 bg-white shadow-[0_18px_45px_rgba(8,145,178,0.12)] ${
                index === 0 || index === 1 ? "md:col-span-2" : ""
              }`}
            >
              <div
                className={`bg-cover bg-center ${
                  index === 0 || index === 1 ? "min-h-96" : "min-h-64"
                }`}
                role="img"
                aria-label={item.label}
                style={{ backgroundImage: `url('${item.src}')` }}
              />
              <figcaption className="bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-cyan-700">
                {item.label}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="bg-cyan-50 py-10 md:py-14">
        <div className="mx-auto max-w-md px-4 md:max-w-6xl">
          <div className="peche-reveal">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
              Avis clients
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">
              Ils racontent leur sortie
            </h2>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {reviews.map((review, index) => (
              <article
                key={`${review.name}-${index}`}
                className="peche-reveal rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.08)]"
              >
                <p className="text-2xl font-black text-cyan-700">★★★★★</p>
                <p className="mt-4 text-sm font-bold leading-6 text-slate-700">
                  “{review.text}”
                </p>
                <p className="mt-5 text-sm font-black uppercase tracking-[0.12em] text-cyan-700">
                  {review.name}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-md gap-5 px-4 py-10 md:max-w-6xl md:grid-cols-[1fr_0.9fr] md:py-14">
        <article className="peche-reveal rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.08)] md:p-7">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
            Localisation
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">
            Marina Taina
          </h2>
          <p className="mt-3 text-base font-bold leading-7 text-slate-700">
            Punaauia, Tahiti
          </p>
          <a
            href="https://www.google.com/maps/search/?api=1&query=Marina%20Taina%20Punaauia%20Tahiti"
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex min-h-14 items-center justify-center bg-cyan-700 px-6 text-base font-black text-white shadow-[0_14px_28px_rgba(8,145,178,0.22)] transition hover:bg-cyan-600"
          >
            Itinéraire Google Maps
          </a>
        </article>

        <article
          id="contact"
          className="peche-reveal rounded-3xl border border-cyan-100 bg-cyan-50 p-5 shadow-[0_18px_45px_rgba(8,145,178,0.08)] md:p-7"
        >
          <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
            Contact
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">
            Une question avant de réserver ?
          </h2>
          <div className="mt-5 grid gap-3 text-sm font-bold leading-6 text-slate-700">
            <p>Téléphone : +689 87 32 16 31</p>
            <p>Email : contact@tahiti-trip.com</p>
            <p>Départ possible depuis Moorea avec supplément carburant.</p>
          </div>
          <a
            href={whatsappUrl}
            className="mt-6 inline-flex min-h-14 w-full items-center justify-center bg-[#25D366] px-6 text-base font-black text-white shadow-[0_14px_28px_rgba(37,211,102,0.24)] transition hover:-translate-y-0.5"
          >
            WhatsApp
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
              Pêche au gros, observation des baleines et permis côtier à Tahiti.
            </p>
          </div>
          <nav className="grid gap-2 text-sm font-bold text-slate-300">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
              Activités
            </p>
            <Link href="/peche">Pêche au gros</Link>
            <Link href="/baleines">Baleines</Link>
            <Link href="/permis">Permis côtier</Link>
          </nav>
          <div className="grid gap-2 text-sm font-bold text-slate-300">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
              Contact
            </p>
            <a href="tel:+68987321631">Téléphone</a>
            <a href="https://wa.me/68987321631">WhatsApp : +689 87 32 16 31</a>
            <a href="mailto:contact@tahiti-trip.com">Email</a>
            <a href="#facebook">Facebook</a>
            <a href="#instagram">Instagram</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
