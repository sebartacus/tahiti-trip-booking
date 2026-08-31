"use client";

import { salonEvaluationDate, useSalonActive } from "@/hooks/useSalonActive";
import { formatXpf } from "@/lib/charter-pricing";
import { getCharterPublicPrice } from "@/lib/public-pricing";

export function CharterOfferPrice({ formula, normalAmount, locale = "fr" }: { formula: string; normalAmount: number; locale?: "fr" | "en" }) {
  const salonActive = useSalonActive();
  const pricing = getCharterPublicPrice(formula, normalAmount, salonEvaluationDate(salonActive));
  return <div className="mt-1">
    {pricing.salonActive && <p className="mb-1 text-xs font-black uppercase tracking-widest text-amber-600">{locale === "en" ? "Salon offer" : "Offre Salon"}</p>}
    {pricing.salonActive && <p className="text-lg font-bold text-slate-500 line-through">{formatXpf(pricing.normalAmount)}</p>}
    <p className="text-4xl font-black tracking-tight sm:text-5xl">{formatXpf(pricing.amount)}</p>
  </div>;
}
