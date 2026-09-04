import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GoogleReviews } from "@/components/GoogleReviews";
import { CharterAvailabilityCalendar } from "../../charter/CharterAvailabilityCalendar";
import { CharterOfferPrice } from "../../charter/CharterOfferPrice";
import {
  CharterReservationProvider,
  CharterReserveButton,
} from "../../charter/CharterReservationNavigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private Catamaran Charter in Tahiti | Tetiaroa, Moorea & Sunset",
  description:
    "Private Lagoon 410 S2 catamaran charter from Tahiti to Tetiaroa, Moorea and sunset cruises. Overnight stays, private trips and online booking.",
  alternates: { canonical: "/en/charter", languages: { fr: "/charter", en: "/en/charter" } },
  openGraph: {
    title: "Charter catamaran Tahiti & Tetiaroa | Tahiti Trip",
    description:
      "Private stays in Tetiaroa, Moorea escapes and sunset cruises aboard a Lagoon 410 S2 departing from Tahiti.",
    url: "https://tahiti-trip.com/en/charter",
    type: "website",
  },
};

const whatsappUrl =
  "https://wa.me/68987321631?text=Ia%20orana%2C%20I%20would%20like%20to%20request%20a%20quote%20for%20a%20private%20charter.";

const boatSpecs = [
  ["12.50 m", "length"], ["7.03 m", "beam"],
  ["4", "double cabins"], ["4", "bathrooms / toilets"],
];

const sunsetPrices = [
  ["1–2 guests", "75 000 F CFP"], ["3–4 guests", "85 000 F CFP"],
  ["5–6 guests", "95 000 F CFP"], ["7–8 guests", "105 000 F CFP"], ["9–10 guests", "115 000 F CFP"],
];

const tetiaroaGallery = [
  {
    src: "/images/charter/489801497_1150110107128062_5537599903856907314_n.jpg",
    alt: "Aerial view of the coconut grove and vast turquoise lagoon of Tetiaroa",
    className: "md:col-span-2 md:row-span-2",
  },
  {
    src: "/images/charter/tetiaroa-plage-couple.jpeg",
    alt: "Couple walking through the lagoon beside a Tetiaroa beach",
    className: "",
  },
  {
    src: "/images/charter/131384120_3101040940122831_822163162198509225_n.jpg",
    alt: "Tetiaroa coconut grove beside a beach and crystal-clear lagoon",
    className: "",
  },
  {
    src: "/images/charter/176202970_3203360309890893_5197823405588831007_n.jpg",
    alt: "Palm-shaded beach facing Tetiaroa's turquoise lagoon",
    className: "md:col-span-2",
  },
  {
    src: "/images/charter/118729407_3000733126820280_1379736198547267946_n.jpg",
    alt: "Hermit crab on the white sand of a Tetiaroa beach",
    className: "",
  },
  {
    src: "/images/charter/484860228_1131150199024053_5373908912383518425_n.jpg",
    alt: "Sunset over Tetiaroa's coconut grove from the Lagoon 410 deck",
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

export default function EnglishCharterPage() {
  return (
    <CharterReservationProvider>
    <main className="min-h-screen overflow-x-hidden bg-[#fbfdfc] text-slate-950">
      <section className="relative min-h-[88svh] overflow-hidden bg-cyan-950 text-white sm:min-h-[92svh]">
        <Image
          src="/images/charter/hero-tetiaroa-palmiers.jpeg"
          alt="White beach, palm trees and turquoise lagoon in Tetiaroa"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/78 via-cyan-950/48 to-cyan-950/16" />
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/78 via-transparent to-cyan-950/28" />

        <div className="relative mx-auto flex min-h-[88svh] max-w-7xl flex-col px-4 py-5 sm:min-h-[92svh] sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <Link href="/charter" className="text-sm font-black text-white">Français</Link>
            <Link href="/" className="inline-flex min-h-11 items-center rounded-full border border-white/35 bg-white/10 px-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/20 sm:px-4">
              ← Back to home
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-bold text-cyan-50 md:flex">
              <a href="#tetiaroa">Tetiaroa</a>
              <a href="#formules">Options</a>
              <a href="#catamaran">The catamaran</a>
              <a href="#devis">Contact</a>
            </nav>
            <a
              href="#devis"
              className="inline-flex min-h-11 items-center rounded-full border border-white/35 bg-white/10 px-3 text-sm font-black backdrop-blur sm:px-4"
            >
              Your project
            </a>
          </header>

          <div className="my-auto max-w-4xl py-10 sm:py-16">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100 sm:text-sm">
              Lagoon 410 S2 · fully private
            </p>
            <h1 className="mt-4 max-w-4xl text-[2.5rem] font-black leading-[0.98] tracking-[-0.04em] min-[390px]:text-[2.75rem] sm:mt-5 sm:text-6xl sm:leading-[0.96] lg:text-7xl">
              Private catamaran charter in Tahiti
            </h1>
            <p className="mt-5 text-xl font-black leading-tight text-amber-100 min-[390px]:text-2xl sm:mt-6 sm:text-3xl">
              Spend the night aboard in Tetiaroa
            </p>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-cyan-50 sm:mt-5 sm:text-xl sm:leading-8">
              Discover Tetiaroa, Moorea and Tahiti sunsets aboard our fully private Lagoon 410 S2.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <a href="#formules" className="inline-flex min-h-14 items-center justify-center rounded-full bg-white px-6 text-base font-black text-cyan-950 shadow-xl shadow-cyan-950/20 transition hover:-translate-y-0.5">
                Discover the options
              </a>
              <a href="#devis" className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/40 bg-white/10 px-6 text-base font-black text-white backdrop-blur transition hover:bg-white/20">
                Request a quote
              </a>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-white/20 py-5 text-xs font-bold text-cyan-50 sm:max-w-xl sm:text-sm">
            <span>Departure<br /><b className="text-white">Marina Taina</b></span>
            <span>Featured destination<br /><b className="text-white">Tetiaroa</b></span>
            <span>Experience<br /><b className="text-white">100% private</b></span>
          </div>
        </div>
      </section>

      <section id="tetiaroa" className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-24 lg:px-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">The signature experience</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.03em] text-cyan-950 sm:text-6xl">Tetiaroa, differently</h2>
          <p className="mt-6 text-lg font-semibold leading-8 text-slate-700">
            Enjoy Tetiaroa beyond a simple day trip: sailing, discovery, sunset, a night aboard the catamaran and waking up surrounded by the landscapes of Tetiaroa.
          </p>
          <div className="mt-7 grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
            {[["The evening", "Sunset in Tetiaroa"], ["The night", "Sleep aboard the catamaran"], ["The morning", "Wake up in Tetiaroa"], ["Your pace", "A private boat just for you"]].map(([eyebrow, text]) => (
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
            alt="Couple in the lagoon beside a white-sand beach in Tetiaroa"
            fill
            sizes="(min-width: 768px) 45vw, 100vw"
            className="object-cover object-center"
          />
        </div>
      </section>

      <section id="formules" className="bg-cyan-950 py-16 text-white md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Stays in Tetiaroa</p>
          <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.03em] sm:text-5xl">Choose how long to disconnect</h2>
          <p className="mt-4 max-w-2xl font-semibold leading-7 text-cyan-100">Up to 9 guests — the price is for the private catamaran.</p>
          <div className="mt-9 grid gap-5 lg:grid-cols-2">
            {[
              { title: "Tetiaroa — 2 days / 1 night", price: 310000, timing: "Departure at 5:00 AM · return around 6:30 / 7:00 PM the following day", nights: "One night aboard", formula: "tetiaroa_2j_1n" as const },
              { title: "Tetiaroa — 3 days / 2 nights", price: 429000, timing: "An extended stay in Tetiaroa", nights: "Two nights aboard", formula: "tetiaroa_3j_2n" as const },
            ].map((offer, index) => (
              <article key={offer.title} className={`rounded-[2rem] p-6 sm:p-8 ${index === 0 ? "bg-white text-slate-950" : "border border-cyan-700 bg-cyan-900/60"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="max-w-sm text-2xl font-black">{offer.title}</h3>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${index === 0 ? "bg-teal-100 text-teal-900" : "bg-white/10 text-cyan-100"}`}>9 guests max.</span>
                </div>
                <p className={`mt-8 text-xs font-black uppercase tracking-widest ${index === 0 ? "text-teal-700" : "text-cyan-200"}`}>The private catamaran</p>
                <CharterOfferPrice formula={offer.formula} normalAmount={offer.price} locale="en" />
                <p className={`mt-4 text-sm font-semibold leading-6 ${index === 0 ? "text-slate-600" : "text-cyan-100"}`}>{offer.timing}</p>
                <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                  {["Private catamaran", "Skipper", "Fuel", "Meals", offer.nights].map((item) => (
                    <li key={item} className={`flex items-center gap-2 text-sm font-bold ${index === 0 ? "text-slate-700" : "text-cyan-50"}`}><span className="text-teal-400">✓</span>{item}</li>
                  ))}
                </ul>
                <p className={`mt-6 border-t pt-4 text-xs font-semibold ${index === 0 ? "border-slate-200 text-slate-500" : "border-white/10 text-cyan-200"}`}>Alcohol not included.</p>
                <CharterReserveButton locale="en" formula={offer.formula} variant={index === 0 ? "light" : "dark"} />
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
              alt="Exterior aerial view of the Lagoon 410 S2"
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover object-center"
            />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">Your home on the water</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.03em] text-cyan-950 sm:text-5xl">Lagoon 410 S2</h2>
            <p className="mt-5 text-base font-semibold leading-7 text-slate-700">A spacious and stable catamaran, fully reserved for your group, departing from Marina Taina in Tahiti.</p>
            <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-cyan-100">
              {boatSpecs.map(([value, label]) => (
                <div key={label} className="bg-white p-4 sm:p-5"><p className="text-2xl font-black text-cyan-950 sm:text-3xl">{value}</p><p className="mt-1 text-xs font-bold text-slate-600 sm:text-sm">{label}</p></div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-teal-50 p-5 text-sm font-semibold leading-6 text-slate-700">
              <p><b className="text-cyan-950">In Tetiaroa:</b> up to 8 guests use the 4 double cabins. For a group of 9, one comfortable sleeping space is prepared in the saloon.</p>
              <p className="mt-3"><b className="text-cyan-950">Capacities:</b> 9 guests overnight, 12 for Moorea and 10 for Sunset.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#eef9f8] py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">Moorea by private catamaran</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.03em] text-cyan-950 sm:text-5xl">Moorea — Temae</h2>
              <p className="mt-5 font-semibold leading-7 text-slate-700">A private crossing and a stop at your own pace, for up to 12 guests.</p>
            </div>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] sm:aspect-[16/7] sm:min-h-52">
              <Image
                src="/images/charter/lagoon-410-vie-a-bord.jpg"
                alt="Aerial daytime view of the Lagoon 410 S2 and its guests"
                fill
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover object-center"
              />
            </div>
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <article className="rounded-[2rem] border border-cyan-100 bg-white p-6 shadow-[0_16px_40px_rgba(8,145,178,0.08)] sm:p-8">
              <p className="text-xs font-black uppercase tracking-widest text-teal-700">7 AM–1 PM</p><h3 className="mt-3 text-4xl font-black text-cyan-950">95 000 F CFP</h3><p className="mt-2 text-sm font-bold text-slate-600">Up to 4 guests, then +5,000 F CFP per additional guest · 12 max.</p>
              <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs font-bold"><span className="rounded-xl bg-cyan-50 p-3">4 pers.<b className="mt-1 block text-cyan-950">95 000 F</b></span><span className="rounded-xl bg-cyan-50 p-3">6 pers.<b className="mt-1 block text-cyan-950">105 000 F</b></span><span className="rounded-xl bg-cyan-50 p-3">12 pers.<b className="mt-1 block text-cyan-950">135 000 F</b></span></div>
              <CharterReserveButton locale="en" formula="moorea_matin" />
            </article>
            <article className="rounded-[2rem] bg-cyan-950 p-6 text-white shadow-[0_16px_40px_rgba(8,51,68,0.15)] sm:p-8">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-200">Full day</p><h3 className="mt-3 text-4xl font-black">145 000 F CFP</h3><p className="mt-2 text-sm font-bold text-cyan-100">Up to 6 guests, then +5,000 F CFP per additional guest · 12 max.</p>
              <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs font-bold"><span className="rounded-xl bg-white/10 p-3">6 pers.<b className="mt-1 block">145 000 F</b></span><span className="rounded-xl bg-white/10 p-3">8 pers.<b className="mt-1 block">155 000 F</b></span><span className="rounded-xl bg-white/10 p-3">12 pers.<b className="mt-1 block">175 000 F</b></span></div>
              <p className="mt-5 text-xs font-semibold text-cyan-200">Meals included · alcohol not included.</p>
              <CharterReserveButton locale="en" formula="moorea_journee" variant="dark" />
            </article>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-amber-100 via-orange-100 to-rose-200 py-16 md:py-24">
        <div className="absolute right-[-8rem] top-[-8rem] h-96 w-96 rounded-full bg-amber-300/50 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-800">Tahiti&apos;s golden hour, just for you</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.03em] text-slate-950 sm:text-6xl">Private catamaran sunset</h2>
            <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-700">2.5 hours departing from Marina Taina. Departure time adapted to the season and sunset time.</p>
            <div className="mt-7 inline-flex rounded-full bg-white/70 px-5 py-3 text-sm font-black text-rose-950 shadow-lg shadow-rose-900/5 backdrop-blur">From 75 000 F CFP per catamaran — not per guest.</div>
            <div className="mt-7 rounded-2xl bg-white/65 p-5 text-sm font-semibold leading-6 text-slate-700 backdrop-blur">
              <p><b>1–2 guests:</b> one bottle of white wine or Champagne included.</p><p className="mt-2"><b>From 3 guests:</b> white wine included · Champagne option +15 000 F CFP.</p><p className="mt-2">Maximum 10 guests.</p>
            </div>
            <CharterReserveButton locale="en" formula="sunset" variant="sunset" />
          </div>
          <div className="overflow-hidden rounded-[2rem] bg-white/75 p-2 shadow-2xl shadow-rose-950/10 backdrop-blur">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem]">
              <Image
                src="/images/charter/sunset-moorea.jpg"
                alt="Sunset viewed from the catamaran facing Moorea"
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
          <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">Selected moments</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.03em] text-cyan-950 sm:text-5xl">Tetiaroa in pictures</h2>
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
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">The experience in motion</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.03em] sm:text-5xl">Tetiaroa, a waking dream</h2>
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

      <CharterAvailabilityCalendar locale="en" />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-cyan-100 bg-white p-6 shadow-[0_16px_40px_rgba(8,145,178,0.08)] sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">The charter spirit</p><h2 className="mt-3 text-3xl font-black text-cyan-950 sm:text-4xl">Everything is included</h2><p className="mt-4 font-semibold leading-7 text-slate-700">For Tetiaroa stays, simply relax: the essentials are already arranged.</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2"><CheckItem>Skipper</CheckItem><CheckItem>Fuel</CheckItem><CheckItem>Meals</CheckItem><CheckItem>Accommodation aboard</CheckItem><CheckItem>Fully private catamaran</CheckItem></ul>
            <p className="mt-5 text-xs font-semibold text-slate-500">Alcohol not included. Meals are included with the Moorea full-day option.</p>
          </article>
          <article className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Full transparency</p><h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Booking terms</h2>
            <ul className="mt-6 grid gap-4"><CheckItem>Full payment or a 30% deposit for charters bookable online.</CheckItem><CheckItem>If a 30% deposit is paid, the remaining balance must be paid no later than the day before departure.</CheckItem><CheckItem>In case of cancellation due to weather conditions, amounts paid are refunded minus 3% bank fees.</CheckItem></ul>
          </article>
        </div>
      </section>

      <section id="devis" className="px-4 pb-16 sm:px-6 md:pb-24 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.25rem] bg-teal-700 p-6 text-white shadow-2xl shadow-teal-900/15 sm:p-10 lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10 lg:p-14">
          <div><p className="text-xs font-black uppercase tracking-[0.22em] text-teal-100">Let&apos;s create your escape</p><h2 className="mt-3 text-4xl font-black tracking-[-0.03em] sm:text-5xl">Have a special project?</h2><p className="mt-5 max-w-2xl font-semibold leading-7 text-teal-50">A custom stay, different duration, Moorea, private event or special request: tell us about your project.</p></div>
          <a href={whatsappUrl} className="mt-8 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-white px-7 text-base font-black text-teal-900 shadow-xl transition hover:-translate-y-0.5 lg:mt-0 lg:w-auto">Request a quote</a>
        </div>
      </section>

      <section className="bg-cyan-50 py-14 md:py-20"><div className="mx-auto max-w-6xl px-4 sm:px-6"><GoogleReviews /></div></section>

      <footer className="bg-cyan-950 px-4 py-10 text-white"><div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black uppercase tracking-[0.18em]">Tahiti Trip</p><p className="mt-2 text-sm font-semibold text-cyan-200">Private charters departing from Marina Taina.</p></div><div className="flex flex-wrap gap-5 text-sm font-bold text-cyan-100"><Link href="/en">Home</Link><Link href="/en/contact">Contact</Link><a href="tel:+68987321631">+689 87 32 16 31</a></div></div></footer>
    </main>
    </CharterReservationProvider>
  );
}


