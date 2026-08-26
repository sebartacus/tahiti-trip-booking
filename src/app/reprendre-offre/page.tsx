import type { Metadata } from "next";
import { ReprendreOffreClient } from "./ReprendreOffreClient";

export const metadata: Metadata = {
  title: "Réserver votre offre Salon | Tahiti Trip Fishing",
  description: "Choisissez la date de votre offre achetée au Salon.",
  robots: { index: false, follow: false },
};

export default function ReprendreOffrePage() {
  return <ReprendreOffreClient />;
}
