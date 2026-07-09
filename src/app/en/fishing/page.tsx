import type { Metadata } from "next";
import Link from "next/link";
import { PecheBookingForm } from "@/components/peche/PecheBookingForm";

export const metadata: Metadata = {
  title: "Sport fishing in Tahiti",
  description:
    "Book a private sport fishing trip in Tahiti with professional gear, a local crew and departure from Marina Taina.",
  alternates: {
    canonical: "/en/fishing",
    languages: {
      fr: "/peche",
      en: "/en/fishing",
    },
  },
  openGraph: {
    title: "Sport fishing in Tahiti | Tahiti Trip Fishing",
    description:
      "Private half-day or full-day offshore fishing trips around Tahiti.",
    url: "https://tahiti-trip.com/en/fishing",
    images: [
      {
        url: "/images/peche/marlin.jpg",
        width: 1200,
        height: 630,
        alt: "Sport fishing in Tahiti",
      },
    ],
  },
};

const heroImage = "/images/peche/hero.jpg";

const highlights = [
  { title: "Private boat", text: "Rodman 900 Olphi Nui" },
  { title: "Up to 4 guests", text: "Comfortable private experience" },
  { title: "Professional gear", text: "Ready for offshore fishing" },
  { title: "French / English", text: "Bilingual welcome" },
];

const species = [
  { name: "Marlin", image: "/images/peche/marlin.jpg" },
  { name: "Tuna", image: "/images/peche/thon.jpg" },
  { name: "Mahi-mahi", image: "/images/peche/mahi-mahi.jpeg" },
  { name: "Wahoo", image: "/images/peche/thazard.jpeg" },
  { name: "Bonito", image: "/images/peche/bonite.jpeg" },
];

const galleryImages = [
  { src: "/images/peche/hero.jpg", title: "Departure" },
  { src: "/images/peche/rodman.jpg", title: "Offshore" },
  { src: "/images/peche/combat.jpg", title: "Fight" },
  { src: "/images/peche/marlin.jpg", title: "Catch" },
  { src: "/images/peche/thon.jpg", title: "Return" },
  { src: "/images/peche/clients.jpg", title: "Guests" },
];

const fishingVideos = [
  {
    id: "fishing-trips",
    title: "A few images from our fishing trips",
    src: "/videos/peche/haura-tetiaroa-2025.mp4",
    poster: "/images/peche/video-cover.jpg",
  },
];

function EnglishFishingHero() {
  return (
    <section className="relative min-h-[86svh] overflow-hidden bg-cyan-50 text-white">
      <div
        aria-label="Sport fishing boat in Tahiti"
        className="absolute inset-0 bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url('${heroImage}')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/36 via-cyan-900/8 to-white/0" />
      <div className="relative mx-auto flex min-h-[86svh] max-w-5xl flex-col justify-between px-4 pb-5 pt-5 md:pb-6">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/en"
            className="text-sm font-black uppercase tracking-[0.18em] text-white"
          >
            Tahiti Trip Fishing
          </Link>
          <nav className="flex items-center gap-3 text-xs font-black text-cyan-50 md:gap-5 md:text-sm">
            <Link href="/peche" className="text-cyan-50/75">
              FR
            </Link>
            <Link href="/en/fishing" className="text-white">
              EN
            </Link>
          </nav>
        </header>

        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-cyan-50">
            Tahiti Trip Fishing
          </p>
          <h1 className="mt-3 max-w-xl text-[2.1rem] font-black leading-[0.98] md:text-5xl">
            Sport fishing in Tahiti
          </h1>
          <p className="mt-4 max-w-xl text-xl font-bold leading-8 text-cyan-50">
            Your boat. Your crew. Your ocean adventure.
          </p>
        </div>
      </div>
    </section>
  );
}

function EnglishFishingVideo() {
  const video = fishingVideos[0];

  return (
    <section className="peche-reveal mx-auto w-full max-w-5xl px-4 py-8 md:py-10">
      <div className="mb-4">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
          Video
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">
          {video.title}
        </h2>
      </div>

      <div className="overflow-hidden rounded-3xl border border-cyan-100 bg-cyan-50 shadow-[0_20px_50px_rgba(8,145,178,0.12)]">
        <video
          className="aspect-video w-full object-cover"
          controls
          playsInline
          poster={video.poster}
          preload="metadata"
          src={video.src}
        />
      </div>
    </section>
  );
}

function EnglishFishingIntro() {
  return (
    <section className="peche-reveal mx-auto max-w-3xl px-2 text-center">
      <p className="text-xl font-semibold leading-9 text-slate-700 md:text-2xl md:leading-10">
        &quot;At sunrise, leave the marina behind, feel the ocean open up ahead, and
        enjoy a private offshore fishing trip around Tahiti with a passionate
        local crew.&quot;
      </p>
    </section>
  );
}

function EnglishFishingHighlights() {
  return (
    <section className="peche-reveal space-y-4 rounded-3xl bg-cyan-50 p-5 md:p-7">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
          Why choose us
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">
          A private, simple and carefully organized trip
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-[0_16px_38px_rgba(8,145,178,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(8,145,178,0.14)]"
          >
            <h3 className="text-lg font-black text-slate-950">
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

function EnglishFishingSpecies() {
  return (
    <section className="peche-reveal space-y-4 rounded-3xl bg-cyan-50 p-5 md:p-7">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
          Target species
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">
          Offshore game fish
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

function EnglishFishingGallery() {
  return (
    <section className="peche-reveal space-y-4">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
          Photos
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">
          A day at sea
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

function EnglishFishingInfoCards() {
  return (
    <>
      <section className="peche-reveal grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(8,145,178,0.12)] md:col-span-2 md:p-7">
          <h2 className="text-2xl font-black text-slate-950">
            Fish and lunch
          </h2>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
            Guests leave with part of the fish, or all of it when the catch is
            smaller.
          </p>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
            On full-day trips, lunch is served as sandwiches with charcuterie,
            smoked chicken, cheese and sushi when available.
          </p>
        </article>

        <article className="rounded-3xl border border-cyan-100 bg-cyan-50 p-5 shadow-[0_18px_45px_rgba(8,145,178,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(8,145,178,0.12)] md:p-7">
          <h2 className="text-2xl font-black text-cyan-950">Moorea</h2>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
            Departure from Moorea may be possible on request, with an additional
            fuel supplement.
          </p>
          <a
            href="https://wa.me/68987321631"
            className="mt-4 inline-flex min-h-12 items-center justify-center bg-[#25D366] px-5 text-sm font-black text-white transition hover:-translate-y-0.5"
          >
            WhatsApp
          </a>
        </article>
      </section>

      <section className="peche-reveal rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(8,145,178,0.12)] md:p-7">
        <h2 className="text-2xl font-black text-slate-950">Weather</h2>
        <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
          Free rescheduling or refund in case of weather cancellation. Only bank
          fees related to secure payment remain at the customer&apos;s charge.
        </p>
      </section>
    </>
  );
}

export default function EnglishFishingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <EnglishFishingHero />
      <div className="mx-auto w-full max-w-5xl px-4 pt-6">
        <Link
          href="/en"
          className="inline-flex min-h-11 items-center rounded-full border border-cyan-100 bg-cyan-50 px-4 text-sm font-black text-cyan-800 transition hover:bg-cyan-100"
        >
          ← Back to home
        </Link>
      </div>
      <EnglishFishingVideo />

      <div className="mx-auto max-w-md space-y-8 px-4 py-8 md:max-w-5xl md:py-10">
        <EnglishFishingIntro />
        <EnglishFishingHighlights />
        <PecheBookingForm locale="en" />
        <EnglishFishingSpecies />
        <EnglishFishingGallery />
        <EnglishFishingInfoCards />
      </div>
    </main>
  );
}
