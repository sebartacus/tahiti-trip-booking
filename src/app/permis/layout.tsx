import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Permis bateau à Tahiti",
  description:
    "Inscription au permis bateau côtier à Tahiti avec accompagnement dossier, cours pratique et paiement sécurisé.",
  alternates: {
    canonical: "/permis",
  },
  openGraph: {
    title: "Permis bateau à Tahiti | Tahiti Trip Fishing",
    description:
      "Formation permis côtier à Tahiti avec suivi clair des documents et cours pratique.",
    url: "https://tahiti-trip.com/permis",
    images: [
      {
        url: "/images/peche/rodman.jpg",
        width: 1200,
        height: 630,
        alt: "Permis bateau à Tahiti",
      },
    ],
  },
};

export default function PermisLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
