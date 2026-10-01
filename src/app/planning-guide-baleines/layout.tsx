import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guide Baleines",
  description: "Planning des sorties et préparation du matériel pour la guide Baleines.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  alternates: { canonical: "/planning-guide-baleines" },
  openGraph: {
    title: "Guide Baleines", description: "Espace de consultation de la guide Baleines.",
    url: "/planning-guide-baleines", images: [],
  },
};
export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
