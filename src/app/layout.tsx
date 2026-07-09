import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tahiti-trip.com"),
  title: {
    default: "Tahiti Trip Fishing | Pêche, baleines et permis bateau à Tahiti",
    template: "%s | Tahiti Trip Fishing",
  },
  description:
    "Tahiti Trip Fishing organise des sorties pêche au gros, observation des baleines et formations permis bateau au départ de Tahiti.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_PF",
    siteName: "Tahiti Trip Fishing",
    url: "https://tahiti-trip.com",
    title: "Tahiti Trip Fishing | Pêche, baleines et permis bateau à Tahiti",
    description:
      "Sorties en mer, pêche au gros, observation des baleines et permis bateau à Tahiti.",
    images: [
      {
        url: "/images/peche/hero.jpg",
        width: 1200,
        height: 630,
        alt: "Tahiti Trip Fishing en mer à Tahiti",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
