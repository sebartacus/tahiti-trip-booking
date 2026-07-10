import type { Metadata } from "next";
import Link from "next/link";
import { PecheBookingForm } from "@/components/peche/PecheBookingForm";
import { PecheGallery } from "@/components/peche/PecheGallery";
import { PecheHero } from "@/components/peche/PecheHero";
import { PecheHighlights } from "@/components/peche/PecheHighlights";
import { PecheInfoCards } from "@/components/peche/PecheInfoCards";
import { PecheIntro } from "@/components/peche/PecheIntro";
import { PecheSpecies } from "@/components/peche/PecheSpecies";
import { PecheVideo } from "@/components/peche/PecheVideo";
import { WhatsAppChannelCard } from "@/components/WhatsAppChannelCard";

export const metadata: Metadata = {
  title: "Pêche au gros à Tahiti",
  description:
    "Réservez une sortie pêche au gros privée à Tahiti avec matériel professionnel, équipage local et départ Marina Taina.",
  alternates: {
    canonical: "/peche",
    languages: {
      fr: "https://tahiti-trip.com/peche",
      en: "https://tahiti-trip.com/en/fishing",
      "x-default": "https://tahiti-trip.com/",
    },
  },
  openGraph: {
    title: "Pêche au gros à Tahiti | Tahiti Trip Fishing",
    description:
      "Sorties demi-journée ou journée complète pour pêcher au large de Tahiti.",
    url: "https://tahiti-trip.com/peche",
    images: [
      {
        url: "/images/peche/marlin.jpg",
        width: 1200,
        height: 630,
        alt: "Pêche au gros à Tahiti",
      },
    ],
  },
};

export default function PechePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PecheHero />
      <div className="mx-auto w-full max-w-5xl px-4 pt-6">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-full border border-cyan-100 bg-cyan-50 px-4 text-sm font-black text-cyan-800 transition hover:bg-cyan-100"
        >
          ← Retour à l&apos;accueil
        </Link>
      </div>
      <div className="pt-6">
        <WhatsAppChannelCard locale="fr" />
      </div>
      <PecheVideo />

      <div className="mx-auto max-w-md space-y-8 px-4 py-8 md:max-w-5xl md:py-10">
        <PecheIntro />
        <PecheHighlights />
        <PecheBookingForm />
        <PecheSpecies />
        <PecheGallery />
        <PecheInfoCards />
      </div>
    </main>
  );
}
