import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    absolute: "Contact Tahiti Trip",
  },
  description:
    "Contact Tahiti Trip Fishing for sport fishing, whale watching or a private sea request in Tahiti.",
  alternates: {
    canonical: "/en/contact",
    languages: {
      fr: "https://tahiti-trip.com/contact",
      en: "https://tahiti-trip.com/en/contact",
      "x-default": "https://tahiti-trip.com/",
    },
  },
  openGraph: {
    title: "Contact | Tahiti Trip Fishing",
    description:
      "Phone, WhatsApp, email and Marina Taina departure information for your ocean activities in Tahiti.",
    url: "https://tahiti-trip.com/en/contact",
    images: [
      {
        url: "/images/peche/rodman.jpg",
        width: 1200,
        height: 630,
        alt: "Tahiti Trip Fishing boat in Tahiti",
      },
    ],
  },
};

const whatsappUrl =
  "https://wa.me/68987321631?text=Ia%20orana%2C%20I%20would%20like%20to%20contact%20Tahiti%20Trip%20Fishing.";

export default function EnglishContactPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative min-h-[72vh] overflow-hidden bg-slate-950 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          role="img"
          aria-label="Tahiti Trip Fishing boat"
          style={{ backgroundImage: "url('/images/peche/rodman.jpg')" }}
        />
        <div className="absolute inset-0 bg-slate-950/55" />

        <div className="relative mx-auto flex min-h-[72vh] max-w-5xl flex-col justify-between px-4 py-6">
          <header className="flex items-center justify-between gap-4">
            <Link
              href="/en"
              className="text-sm font-black uppercase tracking-[0.18em]"
            >
              Tahiti Trip Fishing
            </Link>
            <nav className="flex items-center gap-3 text-xs font-black md:gap-5 md:text-sm">
              <Link href="/en/fishing" className="hidden md:inline">
                Fishing
              </Link>
              <Link href="/en/whale-watching" className="hidden md:inline">
                Whale watching
              </Link>
              <span className="flex items-center gap-2 border-l border-white/30 pl-3 md:pl-5">
                <Link href="/contact" className="text-cyan-100/75">
                  FR
                </Link>
                <Link href="/en/contact" className="text-white">
                  EN
                </Link>
              </span>
            </nav>
          </header>

          <div className="max-w-2xl pb-10">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-100">
              Contact
            </p>
            <h1 className="mt-4 text-5xl font-black leading-none md:text-7xl">
              Plan your trip in Tahiti
            </h1>
            <p className="mt-5 text-lg font-bold leading-8 text-cyan-50 md:text-xl">
              Write to us for sport fishing, whale watching or a private sea
              request departing from Tahiti.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl px-4 pt-6">
        <Link
          href="/en"
          className="inline-flex min-h-11 items-center rounded-full border border-cyan-100 bg-cyan-50 px-4 text-sm font-black text-cyan-800 transition hover:bg-cyan-100"
        >
          ← Back to home
        </Link>
      </div>

      <section className="mx-auto grid max-w-5xl gap-5 px-4 py-10 md:grid-cols-3 md:py-14">
        <a
          href="tel:+68987321631"
          className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5 font-bold text-cyan-950 transition hover:bg-cyan-100"
        >
          <span className="block text-sm uppercase tracking-[0.14em]">
            Phone
          </span>
          <span className="mt-3 block text-2xl font-black">
            +689 87 32 16 31
          </span>
        </a>
        <a
          href={whatsappUrl}
          className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 font-bold text-emerald-950 transition hover:bg-emerald-100"
        >
          <span className="block text-sm uppercase tracking-[0.14em]">
            WhatsApp
          </span>
          <span className="mt-3 block text-2xl font-black">Fast reply</span>
        </a>
        <a
          href="mailto:contact@tahiti-trip.com"
          className="rounded-2xl border border-slate-200 bg-slate-50 p-5 font-bold text-slate-950 transition hover:bg-slate-100"
        >
          <span className="block text-sm uppercase tracking-[0.14em]">
            Email
          </span>
          <span className="mt-3 block text-2xl font-black">
            contact@tahiti-trip.com
          </span>
        </a>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-12">
        <div className="border-t border-cyan-100 pt-8">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
            Departure
          </p>
          <h2 className="mt-2 text-3xl font-black">Marina Taina, Punaauia</h2>
          <p className="mt-3 max-w-2xl text-base font-bold leading-7 text-slate-700">
            Activities mainly depart from Tahiti. Departure from Moorea may be
            possible depending on the request and weather conditions.
          </p>
        </div>
      </section>
    </main>
  );
}
