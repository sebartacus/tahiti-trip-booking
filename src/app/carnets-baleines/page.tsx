"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  getOffreCarnetBaleines,
  OFFRES_CARNETS_BALEINES,
  type NombreCreditsCarnetBaleines,
} from "@/lib/carnetsBaleines";

const ETAPES = [
  ["01", "J’achète mon carnet"],
  ["02", "Je reçois mon code par e-mail"],
  ["03", "Je réserve ma sortie Baleines"],
  ["04", "Les crédits sont automatiquement déduits"],
] as const;

const FAQ = [
  [
    "Le carnet est-il nominatif ?",
    "Oui, mais son propriétaire peut réserver pour plusieurs personnes.",
  ],
  ["Les observateurs utilisent-ils un crédit ?", "Oui."],
  ["Les enfants utilisent-ils un crédit ?", "Oui."],
  [
    "Jusqu’à quand le carnet est-il valable ?",
    "Jusqu’au 20 novembre 2026.",
  ],
] as const;

export default function CarnetsBaleinesPage() {
  const [typeCarnet, setTypeCarnet] =
    useState<NombreCreditsCarnetBaleines>(10);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const offre = getOffreCarnetBaleines(typeCarnet)!;

  function choisirCarnet(credits: NombreCreditsCarnetBaleines) {
    setTypeCarnet(credits);
    setErreur("");
    document
      .getElementById("achat")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function acheterCarnet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur("");
    setChargement(true);

    try {
      const creationResponse = await fetch("/api/carnets-baleines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type_carnet: typeCarnet,
          prenom_acheteur: prenom,
          nom_acheteur: nom,
          telephone,
          email,
        }),
      });
      const creation = await creationResponse.json();

      if (!creationResponse.ok || !creation.ok || !creation.carnet?.id) {
        throw new Error(
          creation.error || "Impossible de préparer votre carnet."
        );
      }

      const payzenResponse = await fetch("/api/payzen-carnets-baleines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carnet_id: creation.carnet.id }),
      });
      const paiement = await payzenResponse.json();

      if (!payzenResponse.ok || !paiement.url || !paiement.champs) {
        throw new Error(
          paiement.error || "Impossible de préparer le paiement PayZen."
        );
      }

      const formulairePayzen = document.createElement("form");
      formulairePayzen.method = "POST";
      formulairePayzen.action = paiement.url;

      Object.entries(paiement.champs).forEach(([name, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = String(value);
        formulairePayzen.appendChild(input);
      });

      document.body.appendChild(formulairePayzen);
      formulairePayzen.submit();
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue avant le paiement."
      );
      setChargement(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative min-h-[72svh] overflow-hidden bg-cyan-950 text-white">
        <div
          aria-label="Baleine à Tahiti"
          className="absolute inset-0 bg-cover bg-center"
          role="img"
          style={{
            backgroundImage: "url('/images/baleines/hero-baleine-saut.jpg')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-950 via-cyan-950/55 to-cyan-900/10" />
        <div className="relative mx-auto flex min-h-[72svh] max-w-5xl flex-col justify-end px-4 pb-12 pt-24 md:pb-16">
          <Link
            href="/baleines"
            className="mb-8 w-fit rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-black backdrop-blur"
          >
            ← Retour aux sorties Baleines
          </Link>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-100">
            Tahiti Trip Fishing
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-none sm:text-6xl">
            Carnets Baleines
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-cyan-50 sm:text-xl">
            Profitez de tarifs préférentiels et réservez vos sorties en toute
            simplicité pendant toute la saison.
          </p>
          <p className="mt-6 w-fit rounded-2xl bg-white px-5 py-3 text-base font-black uppercase tracking-wide text-cyan-950">
            Valables jusqu’au 20 novembre 2026
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          {OFFRES_CARNETS_BALEINES.map((item) => (
            <article
              key={item.credits}
              className={`relative flex flex-col overflow-hidden rounded-[32px] border p-6 shadow-[0_24px_60px_rgba(8,145,178,0.12)] sm:p-8 ${
                item.credits === 10
                  ? "border-cyan-700 bg-cyan-950 text-white"
                  : "border-cyan-100 bg-white"
              }`}
            >
              {item.credits === 10 && (
                <span className="absolute right-5 top-5 rounded-full bg-amber-300 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-950">
                  Meilleure offre
                </span>
              )}
              <p
                className={`text-sm font-black uppercase tracking-[0.16em] ${
                  item.credits === 10 ? "text-cyan-200" : "text-cyan-700"
                }`}
              >
                {item.nom}
              </p>
              <p className="mt-5 text-4xl font-black sm:text-5xl">
                {item.prix.toLocaleString("fr-FR")}{" "}
                <span className="text-lg">F CFP</span>
              </p>
              <ul className="mt-8 flex-1 space-y-4 text-sm font-bold leading-6 sm:text-base">
                {item.avantages.map((avantage) => (
                  <li key={avantage} className="flex gap-3">
                    <span
                      className={
                        item.credits === 10
                          ? "text-cyan-300"
                          : "text-cyan-700"
                      }
                    >
                      ✓
                    </span>
                    {avantage}
                  </li>
                ))}
              </ul>
              <p
                className={`mt-7 rounded-2xl p-4 text-center font-black ${
                  item.credits === 10
                    ? "bg-white/10 text-amber-200"
                    : "bg-emerald-50 text-emerald-800"
                }`}
              >
                Économie de {item.economie.toLocaleString("fr-FR")} F CFP
              </p>
              <button
                type="button"
                onClick={() => choisirCarnet(item.credits)}
                className={`mt-5 min-h-14 rounded-2xl px-5 text-base font-black transition ${
                  item.credits === 10
                    ? "bg-white text-cyan-950 hover:bg-cyan-50"
                    : "bg-cyan-700 text-white hover:bg-cyan-800"
                }`}
              >
                Acheter ce carnet
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-cyan-50 py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-3xl font-black sm:text-4xl">
            Comment fonctionne le carnet ?
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ETAPES.map(([numero, texte]) => (
              <article
                key={numero}
                className="rounded-3xl border border-cyan-100 bg-white p-5"
              >
                <span className="text-sm font-black text-cyan-700">
                  {numero}
                </span>
                <p className="mt-4 text-lg font-black leading-6">{texte}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="achat"
        className="mx-auto max-w-5xl scroll-mt-6 px-4 py-14 sm:py-20"
      >
        <div className="grid gap-8 lg:grid-cols-[1fr_0.72fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-cyan-700">
              Achat sécurisé
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Acheter mon Carnet Baleines
            </h2>
            <form onSubmit={acheterCarnet} className="mt-8 grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Input
                  label="Prénom"
                  value={prenom}
                  onChange={setPrenom}
                  autoComplete="given-name"
                />
                <Input
                  label="Nom"
                  value={nom}
                  onChange={setNom}
                  autoComplete="family-name"
                />
                <Input
                  label="Téléphone"
                  value={telephone}
                  onChange={setTelephone}
                  type="tel"
                  autoComplete="tel"
                />
                <Input
                  label="E-mail"
                  value={email}
                  onChange={setEmail}
                  type="email"
                  autoComplete="email"
                />
              </div>

              <fieldset>
                <legend className="mb-3 text-sm font-black uppercase tracking-wide text-slate-600">
                  Choix du carnet
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {OFFRES_CARNETS_BALEINES.map((item) => (
                    <label
                      key={item.credits}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 font-black ${
                        typeCarnet === item.credits
                          ? "border-cyan-700 bg-cyan-50 text-cyan-950"
                          : "border-slate-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="type-carnet"
                        checked={typeCarnet === item.credits}
                        onChange={() => setTypeCarnet(item.credits)}
                      />
                      {item.credits} sorties
                    </label>
                  ))}
                </div>
              </fieldset>

              {erreur && (
                <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                  {erreur}
                </p>
              )}

              <button
                type="submit"
                disabled={chargement}
                className="min-h-14 rounded-2xl bg-cyan-700 px-6 text-lg font-black text-white shadow-[0_15px_30px_rgba(8,145,178,0.22)] disabled:bg-slate-300"
              >
                {chargement
                  ? "Redirection vers PayZen..."
                  : `Payer ${offre.prix.toLocaleString("fr-FR")} F CFP`}
              </button>
              <p className="text-center text-xs font-semibold text-slate-500">
                Paiement sécurisé par PayZen. Le carnet est activé uniquement
                après confirmation du paiement.
              </p>
            </form>
          </div>

          <aside className="h-fit rounded-[30px] bg-cyan-950 p-6 text-white lg:sticky lg:top-6">
            <p className="text-sm font-black uppercase tracking-wide text-cyan-200">
              Votre sélection
            </p>
            <h3 className="mt-3 text-2xl font-black">{offre.nom}</h3>
            <p className="mt-4 text-4xl font-black">
              {offre.prix.toLocaleString("fr-FR")} F CFP
            </p>
            <div className="my-6 border-t border-white/15" />
            <p className="font-bold">{offre.credits} crédits disponibles</p>
            <p className="mt-2 text-sm leading-6 text-cyan-100">
              1 crédit = 1 participant, quel que soit son statut.
            </p>
            <p className="mt-5 rounded-2xl bg-white/10 p-4 text-sm font-black text-amber-200">
              Vous économisez {offre.economie.toLocaleString("fr-FR")} F CFP
            </p>
          </aside>
        </div>
      </section>

      <section className="border-t border-cyan-100 bg-slate-50 py-14">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-3xl font-black">Questions fréquentes</h2>
          <div className="mt-7 space-y-3">
            {FAQ.map(([question, reponse]) => (
              <details
                key={question}
                className="group rounded-2xl border border-slate-200 bg-white p-5"
              >
                <summary className="cursor-pointer list-none font-black">
                  {question}
                </summary>
                <p className="mt-3 leading-7 text-slate-600">{reponse}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Input({
  autoComplete,
  label,
  onChange,
  type = "text",
  value,
}: {
  autoComplete: string;
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="text-sm font-black text-slate-700">
      {label}
      <input
        required
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-14 w-full rounded-2xl border border-cyan-100 bg-cyan-50/50 px-4 text-base font-semibold outline-none focus:border-cyan-700 focus:bg-white"
      />
    </label>
  );
}
