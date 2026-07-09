import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Observation des baleines à Tahiti",
  description:
    "Réservez une sortie d'observation des baleines à Tahiti en petit comité, encadrée par une équipe locale au départ de Marina Taina.",
  alternates: {
    canonical: "/baleines",
    languages: {
      fr: "https://tahiti-trip.com/baleines",
      en: "https://tahiti-trip.com/en/whale-watching",
      "x-default": "https://tahiti-trip.com/",
    },
  },
  openGraph: {
    title: "Observation des baleines à Tahiti | Tahiti Trip Fishing",
    description:
      "Sorties baleines respectueuses en petit comité pendant la saison à Tahiti.",
    url: "https://tahiti-trip.com/baleines",
    images: [
      {
        url: "/images/baleines/hero.jpg",
        width: 1200,
        height: 630,
        alt: "Observation des baleines à Tahiti",
      },
    ],
  },
};

export default function BaleinesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
