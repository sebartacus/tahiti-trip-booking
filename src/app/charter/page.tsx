import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GoogleReviews } from "@/components/GoogleReviews";
import { CharterAvailabilityCalendar } from "./CharterAvailabilityCalendar";

export const metadata: Metadata = {
  title: "Charter catamaran Tahiti & Tetiaroa | Tahiti Trip",
  description:
    "Privatisez notre Lagoon 410 S2 au départ de Tahiti : séjours à Tetiaroa, Moorea et sunset en catamaran. Skipper, carburant et prestations incluses selon la formule.",
  alternates: { canonical: "/charter" },
  openGraph: {
    title: "Charter catamaran Tahiti & Tetiaroa | Tahiti Trip",
    description:
      "Séjours privés à Tetiaroa, escapades à Moorea et sunsets en Lagoon 410 S2 au départ de Tahiti.",
    url: "https://tahiti-trip.com/charter",
    type: "website",
  },
};

const whatsappUrl =
  "https://wa.me/68987321631?text=Ia%20orana%2C%20je%20souhaite%20recevoir%20un%20devis%20pour%20un%20charter%20priv%C3%A9.";

const boatSpecs = [
  ["12,50 m", "de longueur"],
  ["7,03 m", "de largeur"],
  ["4", "cabines doubles"],
  ["4", "WC / salles de bain"],
];

const sunsetPrices = [
  ["1–2 personnes", "75 000 F CFP"],
  ["3–4 personnes", "85 000 F CFP"],
  ["5–6 personnes", "95 000 F CFP"],
  ["7–8 personnes", "105 000 F CFP"],
  ["9–10 personnes", "115 000 F CFP"],
];

const tetiaroaGallery = [
  {
    src: "/images/charter/489801497_1150110107128062_5537599903856907314_n.jpg",
    alt: "Vue aérienne de la cocoteraie et du vaste lagon turquoise de Tetiaroa",
    className: "md:col-span-2 md:row-span-2",
  },
  {
    src: "/images/charter/tetiaroa-plage-couple.jpeg",
    alt: "Couple marchant dans le lagon au bord d'une plage de Tetiaroa",
    className: "",
  },
  {
    src: "/images/charter/131384120_3101040940122831_822163162198509225_n.jpg",
    alt: "Cocoteraie de Tetiaroa bordant une plage et un lagon cristallin",
    className: "",
  },
  {
    src: "/images/charter/176202970_3203360309890893_5197823405588831007_n.jpg",
    alt: "Plage ombragée de cocotiers face au lagon turquoise de Tetiaroa",
    className: "md:col-span-2",
  },
  {
    src: "/images/charter/118729407_3000733126820280_1379736198547267946_n.jpg",
    alt: "Bernard-l'ermite sur le sable blanc d'une plage de Tetiaroa",
    className: "",
  },
  {
    src: "/images/charter/484860228_1131150199024053_5373908912383518425_n.jpg",
    alt: "Coucher de soleil sur la cocoteraie de Tetiaroa depuis le pont du Lagoon 410",
    className: "",
  },
];

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm font-semibold leading-6 text-slate-700">
      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-black text-teal-800">
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}

export default function CharterPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbfdfc] text-slate-950">
      <section className="relative min-h-[88svh] overflow-hidden bg-cyan-950 text-white sm:min-h-[92svh]">
        <Image
          src="/images/charter/hero-tetiaroa-palmiers.jpeg"
          alt="Plage blanche, palmiers et lagon turquoise à Tetiaroa"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/78 via-cyan-950/48 to-cyan-950/16" />
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/78 via-transparent to-cyan-950/28" />

        <div className="relative mx-auto flex min-h-[88svh] max-w-7xl flex-col px-4 py-5 sm:min-h-[92svh] sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="text-sm font-black uppercase tracking-[0.18em]">
              Tahiti Trip
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-bold text-cyan-50 md:flex">
              <a href="#tetiaroa">Tetiaroa</a>
              <a href="#formules">Formules</a>
              <a href="#catamaran">Le catamaran</a>
              <a href="#devis">Contact</a>
            </nav>
            <a
              href="#devis"
              className="inline-flex min-h-11 items-center rounded-full border border-white/35 bg-white/10 px-3 text-sm font-black backdrop-blur sm:px-4"
            >
              Votre projet
            </a>
          </header>

          <div className="my-auto max-w-4xl py-10 sm:py-16">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100 sm:text-sm">
              Lagoon 410 S2 · entièrement privatisé
            </p>
            <h1 className="mt-4 max-w-4xl text-[2.5rem] font-black leading-[0.98] tracking-[-0.04em] min-[390px]:text-[2.75rem] sm:mt-5 sm:text-6xl sm:leading-[0.96] lg:text-7xl">
              Charter catamaran privé à Tahiti
            </h1>
            <p className="mt-5 text-xl font-black leading-tight text-amber-100 min-[390px]:text-2xl sm:mt-6 sm:text-3xl">
              Passez la nuit à bord à Tetiaroa
            </p>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-cyan-50 sm:mt-5 sm:text-xl sm:leading-8">
              Découvrez Tetiaroa, Moorea et les couchers de soleil de Tahiti à bord de notre Lagoon 410 S2 entièrement privatisé.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <a href="#formules" className="inline-flex min-h-14 items-center justify-center rounded-full bg-white px-6 text-base font-black text-cyan-950 shadow-xl shadow-cyan-950/20 transition hover:-translate-y-0.5">
                Découvrir les formules
              </a>
              <a href="#devis" className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/40 bg-white/10 px-6 text-base font-black text-white backdrop-blur transition hover:bg-white/20">
                Demander un devis
              </a>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-white/20 py-5 text-xs font-bold text-cyan-50 sm:max-w-xl sm:text-sm">
            <span>Départ<br /><b className="text-white">Marina Taina</b></span>
            <span>Destination phare<br /><b className="text-white">Tetiaroa</b></span>
            <span>Expérience<br /><b className="text-white">100 % privée</b></span>
          </div>
        </div>
      </section>

      <section id="tetiaroa" className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-24 lg:px-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">L’expérience signature</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.03em] text-cyan-950 sm:text-6xl">Tetiaroa, autrement</h2>
          <p className="mt-6 text-lg font-semibold leading-8 text-slate-700">
            Profitez de Tetiaroa bien au-delà d’une excursion à la journée : navigation, découverte, coucher de soleil, nuit à bord du catamaran et réveil face aux paysages de Tetiaroa.
          </p>
          <div className="mt-7 grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
            {[["Le soir", "Coucher de soleil à Tetiaroa"], ["La nuit", "Dormir à bord du catamaran"], ["Le matin", "Se réveiller à Tetiaroa"], ["Votre rythme", "Un bateau rien que pour vous"]].map(([eyebrow, text]) => (
              <div key={eyebrow} className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-[0_12px_35px_rgba(8,145,178,0.08)]">
                <p className="text-xs font-black uppercase tracking-wider text-teal-700">{eyebrow}</p>
                <p className="mt-2 text-sm font-bold leading-5 text-slate-800">{text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-2xl shadow-cyan-900/15 md:aspect-auto md:min-h-[38rem]">
          <Image
            src="/images/charter/tetiaroa-plage-couple.jpeg"
            alt="Couple dans le lagon au bord d'une plage blanche de Tetiaroa"
            fill
            sizes="(min-width: 768px) 45vw, 100vw"
            className="object-cover object-center"
          />
        </div>
      </section>

      <section id="formules" className="bg-cyan-950 py-16 text-white md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Séjours à Tetiaroa</p>
          <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.03em] sm:text-5xl">Choisissez le temps de déconnecter</h2>
          <p className="mt-4 max-w-2xl font-semibold leading-7 text-cyan-100">Jusqu’à 9 personnes — le prix concerne la privatisation du catamaran.</p>
          <div className="mt-9 grid gap-5 lg:grid-cols-2">
            {[
              { title: "Tetiaroa — 2 jours / 1 nuit", price: "310 000 F CFP", timing: "Rendez-vous à 5h00 · retour vers 18h30 / 19h le lendemain", nights: "Nuit à bord" },
              { title: "Tetiaroa — 3 jours / 2 nuits", price: "429 000 F CFP", timing: "Un séjour prolongé à Tetiaroa", nights: "Deux nuits à bord" },
            ].map((offer, index) => (
              <article key={offer.title} className={`rounded-[2rem] p-6 sm:p-8 ${index === 0 ? "bg-white text-slate-950" : "border border-cyan-700 bg-cyan-900/60"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="max-w-sm text-2xl font-black">{offer.title}</h3>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${index === 0 ? "bg-teal-100 text-teal-900" : "bg-white/10 text-cyan-100"}`}>9 personnes max.</span>
                </div>
                <p className={`mt-8 text-xs font-black uppercase tracking-widest ${index === 0 ? "text-teal-700" : "text-cyan-200"}`}>Le catamaran privatisé</p>
                <p className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">{offer.price}</p>
                <p className={`mt-4 text-sm font-semibold leading-6 ${index === 0 ? "text-slate-600" : "text-cyan-100"}`}>{offer.timing}</p>
                <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                  {["Catamaran privatisé", "Skipper", "Carburant", "Repas", offer.nights].map((item) => (
                    <li key={item} className={`flex items-center gap-2 text-sm font-bold ${index === 0 ? "text-slate-700" : "text-cyan-50"}`}><span className="text-teal-400">✓</span>{item}</li>
                  ))}
                </ul>
                <p className={`mt-6 border-t pt-4 text-xs font-semibold ${index === 0 ? "border-slate-200 text-slate-500" : "border-white/10 text-cyan-200"}`}>Alcool non compris.</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="catamaran" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem]">
            <Image
              src="/images/charter/lagoon-410-vue-aerienne.jpg"
              alt="Vue aérienne extérieure du Lagoon 410 S2"
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover object-center"
            />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">Votre maison sur l’eau</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.03em] text-cyan-950 sm:text-5xl">Lagoon 410 S2</h2>
            <p className="mt-5 text-base font-semibold leading-7 text-slate-700">Un catamaran spacieux, stable et entièrement réservé à votre groupe, au départ de Marina Taina à Tahiti.</p>
            <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-cyan-100">
              {boatSpecs.map(([value, label]) => (
                <div key={label} className="bg-white p-4 sm:p-5"><p className="text-2xl font-black text-cyan-950 sm:text-3xl">{value}</p><p className="mt-1 text-xs font-bold text-slate-600 sm:text-sm">{label}</p></div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-teal-50 p-5 text-sm font-semibold leading-6 text-slate-700">
              <p><b className="text-cyan-950">À Tetiaroa :</b> jusqu’à 8 participants profitent des 4 cabines doubles. Pour un groupe de 9, un couchage confortable est prévu dans le carré.</p>
              <p className="mt-3"><b className="text-cyan-950">Capacités :</b> 9 passagers avec nuit, 12 pour Moorea et 10 pour le Sunset.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#eef9f8] py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">Moorea en catamaran privé</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.03em] text-cyan-950 sm:text-5xl">Moorea — Direction Temae</h2>
              <p className="mt-5 font-semibold leading-7 text-slate-700">Une traversée privée et une escale à votre rythme, jusqu’à 12 personnes.</p>
            </div>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] sm:aspect-[16/7] sm:min-h-52">
              <Image
                src="/images/charter/lagoon-410-vie-a-bord.jpg"
                alt="Lagoon 410 S2 et ses passagers vus de jour depuis les airs"
                fill
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover object-center"
              />
            </div>
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <article className="rounded-[2rem] border border-cyan-100 bg-white p-6 shadow-[0_16px_40px_rgba(8,145,178,0.08)] sm:p-8">
              <p className="text-xs font-black uppercase tracking-widest text-teal-700">Formule 7h–13h</p><h3 className="mt-3 text-4xl font-black text-cyan-950">95 000 F CFP</h3><p className="mt-2 text-sm font-bold text-slate-600">Jusqu’à 4 personnes, puis +5 000 F CFP par personne · 12 max.</p>
              <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs font-bold"><span className="rounded-xl bg-cyan-50 p-3">4 pers.<b className="mt-1 block text-cyan-950">95 000 F</b></span><span className="rounded-xl bg-cyan-50 p-3">6 pers.<b className="mt-1 block text-cyan-950">105 000 F</b></span><span className="rounded-xl bg-cyan-50 p-3">12 pers.<b className="mt-1 block text-cyan-950">135 000 F</b></span></div>
            </article>
            <article className="rounded-[2rem] bg-cyan-950 p-6 text-white shadow-[0_16px_40px_rgba(8,51,68,0.15)] sm:p-8">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-200">Formule journée</p><h3 className="mt-3 text-4xl font-black">145 000 F CFP</h3><p className="mt-2 text-sm font-bold text-cyan-100">Jusqu’à 6 personnes, puis +5 000 F CFP par personne · 12 max.</p>
              <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs font-bold"><span className="rounded-xl bg-white/10 p-3">6 pers.<b className="mt-1 block">145 000 F</b></span><span className="rounded-xl bg-white/10 p-3">8 pers.<b className="mt-1 block">155 000 F</b></span><span className="rounded-xl bg-white/10 p-3">12 pers.<b className="mt-1 block">175 000 F</b></span></div>
              <p className="mt-5 text-xs font-semibold text-cyan-200">Repas inclus · alcool non compris.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-amber-100 via-orange-100 to-rose-200 py-16 md:py-24">
        <div className="absolute right-[-8rem] top-[-8rem] h-96 w-96 rounded-full bg-amber-300/50 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-800">La lumière de Tahiti rien que pour vous</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.03em] text-slate-950 sm:text-6xl">Sunset privatif en catamaran</h2>
            <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-700">2h30 au départ de Marina Taina. Horaire adapté à la saison et à l’heure du coucher du soleil.</p>
            <div className="mt-7 inline-flex rounded-full bg-white/70 px-5 py-3 text-sm font-black text-rose-950 shadow-lg shadow-rose-900/5 backdrop-blur">À partir de 75 000 F CFP le catamaran — pas par personne.</div>
            <div className="mt-7 rounded-2xl bg-white/65 p-5 text-sm font-semibold leading-6 text-slate-700 backdrop-blur">
              <p><b>1–2 personnes :</b> une bouteille de vin blanc ou de champagne incluse.</p><p className="mt-2"><b>À partir de 3 :</b> vin blanc inclus · option champagne +15 000 F CFP.</p><p className="mt-2">Maximum 10 personnes.</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-[2rem] bg-white/75 p-2 shadow-2xl shadow-rose-950/10 backdrop-blur">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem]">
              <Image
                src="/images/charter/sunset-moorea.jpg"
                alt="Coucher de soleil observé depuis le catamaran face à Moorea"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover object-center"
              />
            </div>
            <div className="mt-2">
              {sunsetPrices.map(([people, price]) => <div key={people} className="flex items-center justify-between gap-3 border-b border-rose-100 px-4 py-4 last:border-0 sm:px-6"><span className="text-sm font-bold text-slate-600">{people}</span><strong className="text-lg font-black text-slate-950 sm:text-xl">{price}</strong></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">Instants choisis</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.03em] text-cyan-950 sm:text-5xl">Tetiaroa en images</h2>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-3 md:auto-rows-[15rem] md:grid-cols-4">
          {tetiaroaGallery.map((photo, index) => (
            <figure
              key={photo.src}
              className={`relative aspect-[4/3] overflow-hidden rounded-[1.5rem] md:aspect-auto md:min-h-0 ${photo.className}`}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes={index === 0 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 100vw"}
                className="object-cover object-center transition duration-700 hover:scale-[1.025]"
              />
            </figure>
          ))}
        </div>
      </section>

      <section className="bg-cyan-950 py-16 text-white md:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">L’expérience en mouvement</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.03em] sm:text-5xl">Tetiaroa, un rêve éveillé</h2>
          </div>
          <div className="overflow-hidden rounded-[2rem] bg-black shadow-2xl shadow-black/30">
            <video
              controls
              playsInline
              preload="metadata"
              poster="/images/charter/hero-tetiaroa-palmiers.jpeg"
              className="aspect-video h-auto w-full object-contain"
            >
              <source src="/videos/charter/tetiaroa-reve-eveille.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      <CharterAvailabilityCalendar />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-cyan-100 bg-white p-6 shadow-[0_16px_40px_rgba(8,145,178,0.08)] sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">L’esprit charter</p><h2 className="mt-3 text-3xl font-black text-cyan-950 sm:text-4xl">Tout est compris</h2><p className="mt-4 font-semibold leading-7 text-slate-700">Pour les séjours Tetiaroa, profitez simplement : l’essentiel est déjà organisé.</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2"><CheckItem>Skipper</CheckItem><CheckItem>Carburant</CheckItem><CheckItem>Repas</CheckItem><CheckItem>Hébergement à bord</CheckItem><CheckItem>Catamaran entièrement privatisé</CheckItem></ul>
            <p className="mt-5 text-xs font-semibold text-slate-500">Alcool non compris. Pour la formule Moorea journée, le repas est inclus.</p>
          </article>
          <article className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">En toute transparence</p><h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Conditions de réservation</h2>
            <ul className="mt-6 grid gap-4"><CheckItem>Paiement intégral ou acompte de 30 % pour les charters réservables en ligne.</CheckItem><CheckItem>En cas de paiement d’un acompte de 30 %, le solde est à régler au plus tard la veille du départ.</CheckItem><CheckItem>En cas d’annulation pour raisons météorologiques : remboursement des sommes versées, moins 3 % de frais bancaires.</CheckItem></ul>
          </article>
        </div>
      </section>

      <section id="devis" className="px-4 pb-16 sm:px-6 md:pb-24 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.25rem] bg-teal-700 p-6 text-white shadow-2xl shadow-teal-900/15 sm:p-10 lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10 lg:p-14">
          <div><p className="text-xs font-black uppercase tracking-[0.22em] text-teal-100">Créons votre parenthèse</p><h2 className="mt-3 text-4xl font-black tracking-[-0.03em] sm:text-5xl">Un projet particulier ?</h2><p className="mt-5 max-w-2xl font-semibold leading-7 text-teal-50">Séjour personnalisé, autre durée, Moorea, événement privé ou demande particulière : racontez-nous votre projet.</p></div>
          <a href={whatsappUrl} className="mt-8 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-white px-7 text-base font-black text-teal-900 shadow-xl transition hover:-translate-y-0.5 lg:mt-0 lg:w-auto">Demander un devis</a>
        </div>
      </section>

      <section className="bg-cyan-50 py-14 md:py-20"><div className="mx-auto max-w-6xl px-4 sm:px-6"><GoogleReviews /></div></section>

      <footer className="bg-cyan-950 px-4 py-10 text-white"><div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black uppercase tracking-[0.18em]">Tahiti Trip</p><p className="mt-2 text-sm font-semibold text-cyan-200">Charters privés au départ de Marina Taina.</p></div><div className="flex flex-wrap gap-5 text-sm font-bold text-cyan-100"><Link href="/">Accueil</Link><Link href="/contact">Contact</Link><a href="tel:+68987321631">+689 87 32 16 31</a></div></div></footer>
    </main>
  );
}
