import type { Metadata } from "next";
import { SalonOffers } from "./SalonOffers";

export const metadata: Metadata = {
  title: "Offres Salon du Tourisme",
  description: "Les offres exclusives Salon du Tourisme de Tahiti Trip Fishing.",
  alternates: { canonical: "/salon" },
  robots: { index: false, follow: false },
};

export default function SalonPage() {
  return <SalonOffers />;
}
