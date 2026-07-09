import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactez Tahiti Trip Fishing pour une sortie pêche, baleines ou une formation permis bateau à Tahiti.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact | Tahiti Trip Fishing",
    description:
      "Téléphone, WhatsApp, email et départ Marina Taina pour vos activités en mer à Tahiti.",
    url: "https://tahiti-trip.com/contact",
    images: [
      {
        url: "/images/peche/rodman.jpg",
        width: 1200,
        height: 630,
        alt: "Bateau Tahiti Trip Fishing à Tahiti",
      },
    ],
  },
};

const whatsappUrl =
  "https://wa.me/68987321631?text=Ia%20orana%2C%20je%20souhaite%20contacter%20Tahiti%20Trip%20Fishing.";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative min-h-[72vh] overflow-hidden bg-slate-950 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          role="img"
          aria-label="Bateau Tahiti Trip Fishing"
          style={{ backgroundImage: "url('/images/peche/rodman.jpg')" }}
        />
        <div className="absolute inset-0 bg-slate-950/55" />

        <div className="relative mx-auto flex min-h-[72vh] max-w-5xl flex-col justify-between px-4 py-6">
          <header className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="text-sm font-black uppercase tracking-[0.18em]"
            >
              Tahiti Trip Fishing
            </Link>
            <nav className="hidden items-center gap-5 text-sm font-bold md:flex">
              <Link href="/peche">Pêche</Link>
              <Link href="/baleines">Baleines</Link>
              <Link href="/permis">Permis</Link>
            </nav>
          </header>

          <div className="max-w-2xl pb-10">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-100">
              Contact
            </p>
            <h1 className="mt-4 text-5xl font-black leading-none md:text-7xl">
              Organiser votre sortie à Tahiti
            </h1>
            <p className="mt-5 text-lg font-bold leading-8 text-cyan-50 md:text-xl">
              Écrivez-nous pour une réservation pêche, baleines, permis bateau
              ou une demande privée au départ de Tahiti.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-5 px-4 py-10 md:grid-cols-3 md:py-14">
        <a
          href="tel:+68987321631"
          className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5 font-bold text-cyan-950 transition hover:bg-cyan-100"
        >
          <span className="block text-sm uppercase tracking-[0.14em]">
            Téléphone
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
          <span className="mt-3 block text-2xl font-black">
            Réponse rapide
          </span>
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
            Départ
          </p>
          <h2 className="mt-2 text-3xl font-black">Marina Taina, Punaauia</h2>
          <p className="mt-3 max-w-2xl text-base font-bold leading-7 text-slate-700">
            Les activités partent principalement de Tahiti. Un départ depuis
            Moorea peut être étudié selon la demande et la météo.
          </p>
        </div>
      </section>
    </main>
  );
}
