"use client";

import { useState } from "react";
import {
  formatSalonPrice,
  SALON_CONTACT,
  SALON_PRICING,
} from "@/lib/salon-pricing";

type Activity = "permis" | "baleines" | "peche" | "charter";

const activities: { id: Activity; title: string; image: string; imagePosition?: string }[] = [
  { id: "baleines", title: "Observation des baleines", image: "/images/baleines/hero.jpg" },
  { id: "peche", title: "Pêche au gros", image: "/images/peche/marlin.jpg" },
  { id: "permis", title: "Permis côtier", image: "/images/peche/rodman.jpg", imagePosition: "center 62%" },
  { id: "charter", title: "Charter privé", image: "/images/charter/lagoon-410-vue-aerienne.jpg" },
];

function Price({ salon, normal, suffix }: { salon: number; normal?: number; suffix?: string }) {
  return (
    <div className="mt-4">
      {normal ? <p className="text-sm font-bold text-slate-400 line-through">{formatSalonPrice(normal)}</p> : null}
      <p className="break-words text-[1.75rem] font-black leading-tight tracking-[-0.03em] text-cyan-950 sm:text-3xl">
        {formatSalonPrice(salon)}{suffix ? <span className="text-sm tracking-normal text-slate-600"> {suffix}</span> : null}
      </p>
    </div>
  );
}

function SalonBadge({ children = "Offre Salon" }: { children?: React.ReactNode }) {
  return <span className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-teal-900">{children}</span>;
}

function OfferCard({ children, featured = false, className = "" }: { children: React.ReactNode; featured?: boolean; className?: string }) {
  return <article className={`${featured ? "overflow-hidden rounded-[1.75rem] bg-cyan-950 p-5 text-white shadow-xl shadow-cyan-950/15 sm:p-7" : "rounded-[1.75rem] border border-cyan-100 bg-white p-5 shadow-[0_16px_40px_rgba(8,145,178,0.08)] sm:p-6"} ${className}`}>{children}</article>;
}

function Benefits({ items, featured = false }: { items: readonly string[]; featured?: boolean }) {
  return <ul className="mt-5 grid gap-2.5">{items.map(item => <li key={item} className={`flex gap-2 text-sm font-semibold leading-5 ${featured ? "text-cyan-50" : "text-slate-700"}`}><span className={`font-black ${featured ? "text-teal-300" : "text-teal-600"}`} aria-hidden="true">✓</span><span>{item}</span></li>)}</ul>;
}

function ValidityBadge({ date, availability = false }: { date: string; availability?: boolean }) {
  return <div className="mt-5 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-black leading-5 text-teal-950"><p><span className="uppercase tracking-[0.1em] text-teal-700">Validité</span> <span aria-hidden="true">•</span> Jusqu&apos;au {date}</p>{availability ? <p className="mt-1 text-xs font-bold text-teal-800">Sous réserve de disponibilités.</p> : null}</div>;
}

function Actions() {
  return (
    <div className="mt-7 rounded-[1.75rem] bg-cyan-50 p-4 sm:p-5">
      <button disabled className="min-h-14 w-full cursor-not-allowed rounded-2xl bg-cyan-900 px-5 font-black text-white opacity-55" title="Réservation Salon bientôt disponible">Profiter de l&apos;offre</button>
      <p className="mt-2 text-center text-xs font-bold text-slate-500">Réservation Salon bientôt disponible</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <a href={SALON_CONTACT.whatsappHref} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#25D366] px-4 text-sm font-black text-white">Nous écrire sur WhatsApp</a>
        <a href={SALON_CONTACT.phoneHref} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-cyan-200 bg-white px-4 text-sm font-black text-cyan-950">Appeler {SALON_CONTACT.phoneDisplay}</a>
      </div>
    </div>
  );
}

function PermisOffers() {
  const p = SALON_PRICING.permis;
  const services = [
    "Application de code",
    "Cours particulier de conduite",
    "Constitution et suivi du dossier",
    "Présentation à l’examen",
  ];

  return <><div className="mb-5 px-1"><h3 className="text-2xl font-black tracking-[-0.02em] text-cyan-950">Votre permis côtier accompagné de A à Z</h3><p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Formation pratique individuelle et accompagnement jusqu’à l’examen.</p></div><div className="grid items-stretch gap-4 sm:grid-cols-2"><OfferCard className="flex h-full flex-col"><SalonBadge /><h3 className="mt-4 text-xl font-black uppercase text-cyan-950">Formule classique</h3><Price salon={p.classique.salon} normal={p.classique.normal} /><ul className="mt-5 space-y-2.5">{services.map(service => <li key={service} className="flex gap-2 text-sm font-semibold leading-5 text-slate-700"><span className="font-black text-teal-600" aria-hidden="true">✓</span><span>{service}</span></li>)}</ul><p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-black text-amber-950 sm:mt-auto sm:translate-y-2">Timbres fiscaux à fournir</p></OfferCard><OfferCard className="flex h-full flex-col"><SalonBadge /><h3 className="mt-4 text-xl font-black uppercase text-cyan-950">Formule sérénité</h3><Price salon={p.serenite.salon} normal={p.serenite.normal} /><ul className="mt-5 space-y-2.5">{services.map(service => <li key={service} className="flex gap-2 text-sm font-semibold leading-5 text-slate-700"><span className="font-black text-teal-600" aria-hidden="true">✓</span><span>{service}</span></li>)}</ul><div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-teal-950 sm:mt-auto sm:translate-y-2"><p className="text-sm font-black">Timbres fiscaux inclus</p><p className="mt-1 text-xs font-bold leading-5 text-teal-800">Tahiti Trip Fishing s&apos;en occupe.</p></div></OfferCard></div><ValidityBadge date={p.validite} /><Actions /></>;
}

function PecheOffers() {
  const p = SALON_PRICING.peche;
  return <><div className="grid gap-4 lg:grid-cols-3"><OfferCard className="order-2 lg:order-1"><SalonBadge>Tarif à la place</SalonBadge><h3 className="mt-4 text-xl font-black text-cyan-950">Une place</h3><div className="mt-5 space-y-4"><div><p className="text-sm font-bold text-slate-500">Demi-journée</p><Price salon={p.place.demiJournee} suffix="/ personne" /></div><div><p className="text-sm font-bold text-slate-500">Journée</p><Price salon={p.place.journee} suffix="/ personne" /></div></div><p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950">Pour l’achat d’une seule place, la date de sortie doit être fixée le jour de l’achat.</p></OfferCard><OfferCard featured className="order-1 lg:order-2"><SalonBadge>Offre Salon</SalonBadge><p className="mt-5 text-xs font-black uppercase tracking-[0.15em] text-cyan-200">Privatisation</p><h3 className="mt-2 text-3xl font-black">Le bateau rien que pour vous</h3><p className="mt-3 text-sm font-bold text-cyan-100">Jusqu’à {p.privatisation.capacite} personnes</p><div className="mt-6 space-y-4"><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs font-bold text-cyan-200">Demi-journée</p><p className="mt-2 text-sm font-bold text-cyan-200 line-through">{formatSalonPrice(p.privatisation.demiJournee.normal)}</p><p className="mt-1 text-3xl font-black">{formatSalonPrice(p.privatisation.demiJournee.salon)}</p><p className="mt-2 text-sm font-bold text-cyan-50">soit {formatSalonPrice(p.privatisation.demiJournee.equivalentParPersonne)} / personne à 4</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs font-bold text-cyan-200">Journée</p><p className="mt-2 text-sm font-bold text-cyan-200 line-through">{formatSalonPrice(p.privatisation.journee.normal)}</p><p className="mt-1 text-3xl font-black">{formatSalonPrice(p.privatisation.journee.salon)}</p><p className="mt-2 text-sm font-bold text-cyan-50">soit {formatSalonPrice(p.privatisation.journee.equivalentParPersonne)} / personne à 4</p></div></div><Benefits featured items={["Bateau privatisé", "Jusqu’à 4 pêcheurs", "Skipper", "Matériel de pêche", "Snacks et boissons hors alcool"]} /><p className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-3 text-sm font-black leading-5 text-white">Le tarif correspond à la privatisation complète du bateau.</p><p className="mt-4 text-sm font-semibold text-cyan-100">Date non obligatoirement fixée le jour de l’achat.</p></OfferCard><OfferCard className="order-3"><SalonBadge>Offre 2 + 1</SalonBadge><p className="mt-5 text-sm font-black uppercase tracking-[0.15em] text-teal-700">2 places achetées</p><p className="mt-1 text-3xl font-black text-cyan-950">= 1 place offerte</p><p className="mt-3 text-sm font-semibold text-slate-600">Les 3 personnes participent à la même sortie.</p><div className="mt-6 grid gap-3"><div className="rounded-2xl bg-cyan-50 p-4"><p className="text-xs font-bold text-slate-500">Demi-journée</p><p className="mt-1 text-2xl font-black text-cyan-950">{formatSalonPrice(p.offreTrois.demiJournee)}</p><p className="text-sm text-slate-600">pour 3 personnes</p></div><div className="rounded-2xl bg-cyan-50 p-4"><p className="text-xs font-bold text-slate-500">Journée</p><p className="mt-1 text-2xl font-black text-cyan-950">{formatSalonPrice(p.offreTrois.journee)}</p><p className="text-sm text-slate-600">pour 3 personnes</p></div></div><p className="mt-5 text-sm font-semibold text-slate-600">Date non obligatoirement fixée le jour de l’achat.</p></OfferCard></div><ValidityBadge date={p.validite} availability /><Actions /></>;
}

function BaleinesOffers() {
  const p = SALON_PRICING.baleines;
  const individualOffers = [
    { label: "Mise à l’eau", ...p.miseEau, suffix: "/ personne" },
    { label: "Observateur", ...p.observateur, suffix: "/ personne" },
    { label: "Enfant -12 ans", ...p.enfantMoinsDouze, suffix: "" },
  ];

  return <><div className="mb-5 rounded-[1.5rem] border border-cyan-100 bg-white p-4 sm:p-5"><h3 className="text-xl font-black text-cyan-950">Une expérience en petit comité</h3><div className="sm:max-w-3xl"><Benefits items={["Sortie en petit groupe", "Capitaine et guide agréés", "Équipement fourni pour la mise à l’eau", "Hydrophone à bord", "Environ 4 heures en mer"]} /></div></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{individualOffers.map(offer => <OfferCard key={offer.label}><SalonBadge /><h3 className="mt-4 text-lg font-black text-cyan-950">{offer.label}</h3><Price salon={offer.salon} normal={offer.normal > offer.salon ? offer.normal : undefined} suffix={offer.suffix} /></OfferCard>)}<OfferCard><SalonBadge /><h3 className="mt-4 text-lg font-black text-cyan-950">Enfant -5 ans</h3><p className="mt-4 text-3xl font-black uppercase text-teal-700">Gratuit</p></OfferCard></div><div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]"><OfferCard featured><SalonBadge>Offre groupe 5 + 1</SalonBadge><p className="mt-5 text-sm font-black uppercase tracking-[0.15em] text-cyan-200">5 places mise à l’eau achetées</p><p className="mt-1 text-3xl font-black">= la 6e offerte</p><p className="mt-3 text-sm font-semibold text-cyan-100">Sur la même sortie.</p><p className="mt-7 text-sm font-bold text-cyan-200 line-through">6 × {formatSalonPrice(p.miseEau.normal)} = {formatSalonPrice(p.groupe.normal)}</p><p className="mt-1 text-3xl font-black">{formatSalonPrice(p.groupe.total)}</p><p className="text-sm font-bold text-cyan-100">pour 6 personnes · offre Salon</p></OfferCard><OfferCard><SalonBadge>Carnets baleines</SalonBadge><h3 className="mt-4 text-xl font-black text-cyan-950">Plusieurs sorties, différentes dates</h3><div className="mt-5 space-y-3">{p.carnets.map(c => <div key={c.sorties} className="rounded-2xl bg-cyan-50 p-4"><p className="font-black text-cyan-950">Carnet {c.sorties} sorties</p><p className="mt-2 text-sm font-bold text-slate-400 line-through">{formatSalonPrice(c.normal)}</p><p className="mt-1 text-2xl font-black text-teal-700">{formatSalonPrice(c.total)}</p><p className="text-sm font-bold text-slate-600">soit {formatSalonPrice(c.parSortie)} / sortie</p><ValidityBadge date={p.validiteCarnets} /></div>)}</div><p className="mt-4 text-sm font-semibold leading-6 text-slate-600">Utilisable sur différentes dates et pour une ou plusieurs personnes, selon les conditions existantes.</p></OfferCard></div><Actions /></>;
}

function CharterOffers() {
  const p = SALON_PRICING.charter;
  return <><div className="grid items-stretch gap-4 sm:grid-cols-2"><OfferCard className="flex h-full flex-col"><SalonBadge /><p className="mt-4 text-xs font-black uppercase tracking-widest text-teal-700">Tetiaroa</p><h3 className="mt-2 text-2xl font-black text-cyan-950">2 jours / 1 nuit</h3><Price salon={p.tetiaroaDeuxJours.salon} normal={p.tetiaroaDeuxJours.normal} /><p className="mt-4 text-sm font-semibold leading-6 text-slate-600">Deux jours pour profiter de Tetiaroa autrement, avec une nuit à bord du catamaran.</p><Benefits items={["Catamaran entièrement privatisé", "Skipper", "Carburant", "Repas", "Nuit à bord", `Jusqu’à ${p.tetiaroaDeuxJours.capacite} personnes`]} /><div className="mt-5 rounded-2xl bg-cyan-50 p-4 text-xs font-semibold leading-5 text-slate-600"><p>Pour 9 personnes, un couchage confortable est prévu dans le carré.</p><p className="mt-2 font-black text-cyan-950">Alcool non inclus.</p></div><ValidityBadge date={p.tetiaroaDeuxJours.validite} availability /></OfferCard><OfferCard className="flex h-full flex-col"><SalonBadge>Sur demande</SalonBadge><p className="mt-4 text-xs font-black uppercase tracking-widest text-teal-700">Tetiaroa</p><h3 className="mt-2 text-2xl font-black text-cyan-950">3 jours / 2 nuits</h3><p className="mt-5 text-3xl font-black text-teal-700">Devis sur demande</p><Benefits items={["Catamaran privatisé", "Skipper", "Carburant", "Repas", "Deux nuits à bord", "Jusqu’à 9 personnes"]} /><p className="mt-5 rounded-2xl bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-950 sm:mt-auto">Nous contacter pour établir votre séjour sur mesure.</p></OfferCard></div><Actions /></>;
}

function ActivityContent({ activity }: { activity: Activity }) {
  if (activity === "permis") return <PermisOffers />;
  if (activity === "baleines") return <BaleinesOffers />;
  if (activity === "peche") return <PecheOffers />;
  return <CharterOffers />;
}

export function SalonOffers() {
  const [open, setOpen] = useState<Activity | null>(null);
  const activeActivity = activities.find((activity) => activity.id === open);

  return <main className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#ecfeff_0%,#f8fafc_34%,#ffffff_100%)] text-slate-950"><header className="relative overflow-hidden bg-cyan-950 px-4 pb-14 pt-6 text-white sm:px-6 sm:pb-20"><div className="absolute -right-24 -top-20 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" /><div className="relative mx-auto max-w-5xl"><div className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-base font-black text-cyan-950">TTF</span><p className="min-w-0 whitespace-nowrap text-[0.72rem] font-black uppercase tracking-[0.12em] text-white min-[390px]:text-sm min-[390px]:tracking-[0.16em] sm:text-base">Tahiti Trip Fishing</p></div><SalonBadge>Exclusivités</SalonBadge><h1 className="mt-5 max-w-3xl text-[2.2rem] font-black uppercase leading-[0.98] tracking-[-0.045em] min-[390px]:text-[2.5rem] sm:text-6xl">Offres Salon du Tourisme</h1><p className="mt-5 max-w-xl text-lg font-semibold leading-7 text-cyan-50">Des offres exclusives pour profiter de Tahiti autrement.</p><p className="mt-5 max-w-xl rounded-2xl border border-white/15 bg-white/10 p-4 text-sm font-bold leading-6 text-cyan-50 backdrop-blur">Offres Salon — conditions et dates de validité selon l’activité.</p></div></header><section className="relative mx-auto -mt-7 w-full max-w-6xl px-3 pb-16 sm:-mt-10 sm:px-6"><h2 className="sr-only">Choisissez une activité</h2><div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">{activities.map(a => { const active = open === a.id; return <article key={a.id} className={`min-w-0 overflow-hidden rounded-[1.5rem] border bg-white shadow-[0_18px_55px_rgba(8,47,73,0.12)] transition duration-300 sm:rounded-[1.75rem] ${active ? "border-cyan-500 ring-4 ring-cyan-100" : "border-cyan-100 hover:-translate-y-1"}`}><h3 className="h-full"><button type="button" aria-expanded={active} aria-controls="salon-active-offers" onClick={() => setOpen(active ? null : a.id)} className="group flex h-full min-h-[13.5rem] w-full touch-manipulation flex-col text-left outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-cyan-300 sm:min-h-[18rem]"><span className="relative block aspect-[4/3] w-full overflow-hidden bg-cyan-100"><span className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.03]" role="img" aria-label={a.title} style={{ backgroundImage: `url('${a.image}')`, backgroundPosition: a.imagePosition }} /><span className="absolute inset-0 bg-gradient-to-t from-cyan-950/45 to-transparent" /></span><span className="flex min-w-0 flex-1 flex-col p-3 sm:p-5"><span className="block text-base font-black leading-tight text-cyan-950 sm:text-xl">{a.title}</span><span className="mt-auto flex items-center justify-between gap-2 pt-3 text-[11px] font-black uppercase leading-4 tracking-[0.06em] text-teal-700 sm:text-xs"><span>Voir les offres Salon</span><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-950 text-base text-white transition-transform ${active ? "rotate-45" : ""}`} aria-hidden="true">+</span></span></span></button></h3></article>})}</div>{open && activeActivity ? <section id="salon-active-offers" aria-label={`Offres Salon — ${activeActivity.title}`} className="mt-4 overflow-hidden rounded-[1.75rem] border border-cyan-100 bg-slate-50/80 p-3 shadow-[0_18px_55px_rgba(8,47,73,0.08)] sm:mt-6 sm:p-5"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-black text-cyan-950 sm:text-2xl">{activeActivity.title}</h2><button type="button" onClick={() => setOpen(null)} className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-cyan-200 bg-white px-4 text-sm font-black text-cyan-950">Fermer</button></div><ActivityContent activity={open} /></section> : null}<footer className="px-2 pt-10 text-center"><p className="text-sm font-bold text-cyan-950">Tahiti Trip Fishing</p><a className="mt-2 inline-block break-all text-sm font-semibold text-teal-700" href={`mailto:${SALON_CONTACT.email}`}>{SALON_CONTACT.email}</a><p className="mt-5 text-xs font-semibold leading-5 text-slate-500">Offres soumises aux conditions précisées pour chaque activité et aux disponibilités.</p></footer></section></main>;
}
