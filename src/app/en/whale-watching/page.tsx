import type { Metadata } from "next";
import { BaleinesPageClient } from "@/app/baleines/BaleinesPageClient";
import { whaleWatchingTranslations } from "@/lib/i18n";

const t = whaleWatchingTranslations.en;

export const metadata: Metadata = {
  title: t.metadata.title,
  description: t.metadata.description,
  alternates: {
    canonical: "/en/whale-watching",
    languages: {
      fr: "/baleines",
      en: "/en/whale-watching",
    },
  },
  openGraph: {
    title: t.metadata.openGraphTitle,
    description: t.metadata.openGraphDescription,
    url: "https://tahiti-trip.com/en/whale-watching",
    images: [
      {
        url: "/images/baleines/hero.jpg",
        width: 1200,
        height: 630,
        alt: t.metadata.imageAlt,
      },
    ],
  },
};

export default function EnglishWhaleWatchingPage() {
  return <BaleinesPageClient locale="en" />;
}
