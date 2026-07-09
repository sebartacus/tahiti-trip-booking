import type { Metadata } from "next";
import { PecheBookingForm } from "@/components/peche/PecheBookingForm";
import { PecheGallery } from "@/components/peche/PecheGallery";
import { PecheHero } from "@/components/peche/PecheHero";
import { PecheHighlights } from "@/components/peche/PecheHighlights";
import { PecheInfoCards } from "@/components/peche/PecheInfoCards";
import { PecheIntro } from "@/components/peche/PecheIntro";
import { PecheSpecies } from "@/components/peche/PecheSpecies";
import { PecheVideo } from "@/components/peche/PecheVideo";

export const metadata: Metadata = {
  title: "Pêche au gros à Tahiti",
  description:
    "Réservez une sortie pêche au gros privée à Tahiti avec matériel professionnel, équipage local et départ Marina Taina.",
  alternates: {
    canonical: "/peche",
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
