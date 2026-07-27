import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Carnets Baleines à Tahiti",
  description:
    "Achetez un Carnet Baleines de 5 ou 10 sorties et réservez vos sorties à Tahiti pendant toute la saison.",
  alternates: {
    canonical: "/carnets-baleines",
  },
  openGraph: {
    title: "Carnets Baleines | Tahiti Trip Fishing",
    description:
      "Des tarifs préférentiels pour vos sorties Baleines à Tahiti.",
    url: "https://tahiti-trip.com/carnets-baleines",
    images: [
      {
        url: "/images/baleines/hero-baleine-saut.jpg",
        width: 1200,
        height: 630,
        alt: "Carnets Baleines à Tahiti",
      },
    ],
  },
};

export default function CarnetsBaleinesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
