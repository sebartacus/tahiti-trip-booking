import Link from "next/link";
import type { WhaleWatchingLocale } from "@/lib/i18n";

export function BookingModeChoice({
  locale = "fr",
}: {
  locale?: WhaleWatchingLocale;
}) {
  const isFrench = locale === "fr";

  return (
    <section className="border-b border-cyan-100 bg-cyan-50 px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
            {isFrench
              ? "🐋 Choisissez votre mode de réservation"
              : "🐋 Choose how you would like to book"}
          </h2>
          <p className="mx-auto mt-4 max-w-3xl font-semibold leading-7 text-slate-600 sm:text-lg">
            {isFrench
              ? "Que vous souhaitiez découvrir les baleines une seule fois ou revenir plusieurs fois pendant la saison, nous avons la formule adaptée."
              : "Whether you want to discover the whales once or return several times during the season, we have the right option for you."}
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <ModeCard
            eyebrow={
              isFrench ? "🎟️ Réservation à l’unité" : "🎟️ Single booking"
            }
            description={
              isFrench
                ? "Idéal pour une sortie occasionnelle."
                : "Ideal for an occasional trip."
            }
            benefits={
              isFrench
                ? [
                    "Réservation simple",
                    "Paiement d’une seule sortie",
                    "Choisissez votre date directement",
                  ]
                : [
                    "Simple booking",
                    "Pay for one trip only",
                    "Choose your date directly",
                  ]
            }
          >
            <a
              href="#reservation-baleines"
              className="mt-7 inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-cyan-700 px-5 text-base font-black text-white shadow-[0_14px_28px_rgba(8,145,178,0.22)] transition hover:bg-cyan-800"
            >
              {isFrench ? "Réserver une sortie" : "Book a trip"}
            </a>
          </ModeCard>

          <ModeCard
            highlighted
            eyebrow={
              isFrench ? "🐋 Carnets Baleines" : "🐋 Whale Watching passes"
            }
            description={
              isFrench
                ? "Vous souhaitez revenir plusieurs fois pendant la saison ?"
                : "Would you like to return several times during the season?"
            }
            benefits={
              isFrench
                ? [
                    "Jusqu’à 35 000 F CFP d’économie",
                    "1 crédit = 1 participant",
                    "Utilisable pour une ou plusieurs personnes",
                    "Valable jusqu’au 20 novembre 2026",
                  ]
                : [
                    "Save up to F CFP 35,000",
                    "1 credit = 1 participant",
                    "Can be used for one or several people",
                    "Valid until November 20, 2026",
                  ]
            }
          >
            <Link
              href="/carnets-baleines"
              className="mt-7 inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-white px-5 text-base font-black text-cyan-950 shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition hover:bg-cyan-50"
            >
              {isFrench ? "Découvrir les Carnets" : "Discover the passes"}
              <span aria-hidden="true" className="ml-2">
                →
              </span>
            </Link>
          </ModeCard>
        </div>
      </div>
    </section>
  );
}

function ModeCard({
  benefits,
  children,
  description,
  eyebrow,
  highlighted = false,
}: {
  benefits: readonly string[];
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  highlighted?: boolean;
}) {
  return (
    <article
      className={`flex h-full flex-col rounded-[28px] border p-6 shadow-[0_18px_45px_rgba(8,145,178,0.10)] sm:p-7 ${
        highlighted
          ? "border-cyan-900 bg-cyan-950 text-white"
          : "border-cyan-100 bg-white text-slate-950"
      }`}
    >
      <h3
        className={`text-2xl font-black ${
          highlighted ? "text-white" : "text-cyan-950"
        }`}
      >
        {eyebrow}
      </h3>
      <p
        className={`mt-3 font-semibold leading-7 ${
          highlighted ? "text-cyan-100" : "text-slate-600"
        }`}
      >
        {description}
      </p>
      <ul className="mt-6 flex-1 space-y-3 text-sm font-bold leading-6">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex gap-3">
            <span
              aria-hidden="true"
              className={highlighted ? "text-cyan-300" : "text-emerald-600"}
            >
              ✓
            </span>
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      {children}
    </article>
  );
}
