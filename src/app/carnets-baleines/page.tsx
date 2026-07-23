"use client";

import { FormEvent, useState } from "react";

type TypeCarnet = 5 | 10;

type CarnetCree = {
  id: string;
  code: string;
  type_carnet: number;
  credits_restants: number;
  prix: number;
};

export default function CarnetsBaleinesPage() {
  const [typeCarnet, setTypeCarnet] = useState<TypeCarnet>(10);
  const [formulaireVisible, setFormulaireVisible] = useState(false);

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");

  const [chargement, setChargement] = useState(false);
  const [chargementPaiement, setChargementPaiement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [carnetCree, setCarnetCree] = useState<CarnetCree | null>(null);

  const prix = typeCarnet === 5 ? 65000 : 115000;

  function choisirCarnet(type: TypeCarnet) {
    setTypeCarnet(type);
    setErreur("");
    setCarnetCree(null);
  }

  function ouvrirFormulaire() {
    setErreur("");
    setCarnetCree(null);
    setFormulaireVisible(true);

    setTimeout(() => {
      document
        .getElementById("formulaire-achat")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  async function creerCarnet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErreur("");
    setCarnetCree(null);

    if (!prenom.trim() || !nom.trim() || !email.trim()) {
      setErreur(
        "Veuillez renseigner votre prénom, votre nom et votre e-mail."
      );
      return;
    }

    setChargement(true);

    try {
      const response = await fetch("/api/carnets-baleines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type_carnet: typeCarnet,
          prenom_acheteur: prenom.trim(),
          nom_acheteur: nom.trim(),
          email: email.trim(),
          telephone: telephone.trim(),
        }),
      });

      const resultat = await response.json();

      if (!response.ok || !resultat.ok) {
        throw new Error(
          resultat.error ||
            "Impossible de créer le carnet pour le moment."
        );
      }

      setCarnetCree(resultat.carnet);
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de la création du carnet."
      );
    } finally {
      setChargement(false);
    }
  }

  async function payerAvecPayZen() {
    if (!carnetCree) return;

    setErreur("");
    setChargementPaiement(true);

    try {
      const response = await fetch("/api/payzen-carnets-baleines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          montant: Number(carnetCree.prix),
          email: email.trim(),
          carnet_id: carnetCree.id,
          carnet_code: carnetCree.code,
          type_carnet: carnetCree.type_carnet,
        }),
      });

      const resultat = await response.json();

      if (!response.ok || !resultat.url || !resultat.champs) {
        throw new Error(
          resultat.error ||
            "Impossible de préparer le paiement PayZen."
        );
      }

      const formulaire = document.createElement("form");

      formulaire.method = "POST";
      formulaire.action = resultat.url;

      Object.entries(resultat.champs).forEach(([nomChamp, valeur]) => {
        const input = document.createElement("input");

        input.type = "hidden";
        input.name = nomChamp;
        input.value = String(valeur);

        formulaire.appendChild(input);
      });

      document.body.appendChild(formulaire);
      formulaire.submit();
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue avant le paiement."
      );

      setChargementPaiement(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">
            Tahiti Trip Fishing
          </p>

          <h1 className="text-3xl font-bold sm:text-5xl">
            Carnets sorties baleines
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Profitez de plusieurs sorties à tarif préférentiel et utilisez vos
            crédits librement pendant toute la saison baleines.
          </p>

          <p className="mt-2 font-semibold text-slate-800">
            Valables jusqu’au 20 novembre 2026.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <button
            type="button"
            onClick={() => choisirCarnet(5)}
            className={`cursor-pointer rounded-3xl border p-6 text-left transition ${
              typeCarnet === 5
                ? "border-sky-600 ring-2 ring-sky-200"
                : "border-slate-200 hover:border-sky-300"
            }`}
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
              Carnet 5 places
            </p>

            <div className="mt-4">
              <span className="text-4xl font-bold">65 000 F CFP</span>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Soit 13 000 F CFP par crédit
            </p>

            <p className="mt-5 text-slate-700">
              5 crédits utilisables à l’unité, à plusieurs ou par vos proches.
            </p>

            <p className="mt-4 font-semibold text-emerald-700">
              Jusqu’à 10 000 F CFP d’économie
            </p>
          </button>

          <button
            type="button"
            onClick={() => choisirCarnet(10)}
            className={`relative cursor-pointer rounded-3xl border p-6 text-left transition ${
              typeCarnet === 10
                ? "border-sky-600 ring-2 ring-sky-200"
                : "border-slate-200 hover:border-sky-300"
            }`}
          >
            <span className="absolute right-5 top-5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
              Meilleure offre
            </span>

            <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
              Carnet 10 places
            </p>

            <div className="mt-4">
              <span className="text-4xl font-bold">115 000 F CFP</span>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Soit 11 500 F CFP par crédit
            </p>

            <p className="mt-5 text-slate-700">
              10 crédits utilisables à l’unité, à plusieurs ou par vos proches.
            </p>

            <p className="mt-4 font-semibold text-emerald-700">
              Jusqu’à 35 000 F CFP d’économie
            </p>
          </button>
        </section>

        <section className="mt-8 rounded-3xl bg-slate-50 p-6 sm:p-8">
          <h2 className="text-xl font-bold">
            Comment fonctionne le carnet ?
          </h2>

          <div className="mt-5 space-y-3 leading-7 text-slate-700">
            <p>
              <strong>1 crédit = 1 place</strong>, quel que soit le type de
              participant choisi.
            </p>

            <p>
              Le carnet peut être utilisé à l’unité, pour plusieurs personnes
              lors d’une même sortie ou être partagé avec vos proches.
            </p>

            <p>Les crédits sont débités dès la réservation.</p>

            <p>
              Aucune annulation n’est possible à l’initiative du client.
            </p>

            <p>
              En cas d’annulation décidée par Tahiti Trip Fishing, notamment
              pour mauvaises conditions météorologiques, les crédits concernés
              sont recrédités.
            </p>

            <p>
              Les crédits non utilisés expirent à la fin de la saison, le{" "}
              <strong>20 novembre 2026</strong>.
            </p>
          </div>
        </section>

        {!formulaireVisible && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={ouvrirFormulaire}
              className="cursor-pointer rounded-full bg-sky-700 px-8 py-4 text-lg font-bold text-white transition hover:bg-sky-800"
            >
              Choisir le carnet {typeCarnet} places
            </button>

            <p className="mt-3 text-sm text-slate-500">
              Montant : {prix.toLocaleString("fr-FR")} F CFP
            </p>
          </div>
        )}

        {formulaireVisible && (
          <section
            id="formulaire-achat"
            className="mt-10 scroll-mt-6 rounded-3xl border border-slate-200 p-6 shadow-sm sm:p-8"
          >
            <div className="mb-7">
              <p className="text-sm font-bold uppercase tracking-wide text-sky-700">
                Votre sélection
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Carnet {typeCarnet} places —{" "}
                {prix.toLocaleString("fr-FR")} F CFP
              </h2>
            </div>

            {!carnetCree ? (
              <form onSubmit={creerCarnet}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="prenom"
                      className="mb-2 block font-semibold"
                    >
                      Prénom *
                    </label>

                    <input
                      id="prenom"
                      type="text"
                      value={prenom}
                      onChange={(event) => setPrenom(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-600"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="nom"
                      className="mb-2 block font-semibold"
                    >
                      Nom *
                    </label>

                    <input
                      id="nom"
                      type="text"
                      value={nom}
                      onChange={(event) => setNom(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-600"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block font-semibold"
                    >
                      E-mail *
                    </label>

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-600"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="telephone"
                      className="mb-2 block font-semibold"
                    >
                      Téléphone
                    </label>

                    <input
                      id="telephone"
                      type="tel"
                      value={telephone}
                      onChange={(event) => setTelephone(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-600"
                    />
                  </div>
                </div>

                {erreur && (
                  <div className="mt-5 rounded-xl bg-red-50 p-4 font-semibold text-red-700">
                    {erreur}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={chargement}
                  className="mt-7 w-full cursor-pointer rounded-xl bg-sky-700 px-6 py-4 text-lg font-bold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {chargement
                    ? "Création en cours..."
                    : `Continuer — ${prix.toLocaleString(
                        "fr-FR"
                      )} F CFP`}
                </button>
              </form>
            ) : (
              <div>
                <div className="rounded-2xl bg-emerald-50 p-6">
                  <p className="text-xl font-bold text-emerald-800">
                    Votre carnet est prêt
                  </p>

                  <p className="mt-4 text-slate-700">
                    Code du carnet :
                  </p>

                  <p className="mt-1 break-all text-2xl font-black tracking-wide text-slate-950">
                    {carnetCree.code}
                  </p>

                  <p className="mt-4 text-slate-700">
                    Crédits :{" "}
                    <strong>{carnetCree.credits_restants}</strong>
                  </p>

                  <p className="mt-1 text-slate-700">
                    Montant :{" "}
                    <strong>
                      {Number(carnetCree.prix).toLocaleString("fr-FR")} F CFP
                    </strong>
                  </p>
                </div>

                {erreur && (
                  <div className="mt-5 rounded-xl bg-red-50 p-4 font-semibold text-red-700">
                    {erreur}
                  </div>
                )}

                <button
                  type="button"
                  onClick={payerAvecPayZen}
                  disabled={chargementPaiement}
                  className="mt-6 w-full cursor-pointer rounded-xl bg-sky-700 px-6 py-4 text-lg font-bold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {chargementPaiement
                    ? "Redirection vers PayZen..."
                    : `Payer ${Number(carnetCree.prix).toLocaleString(
                        "fr-FR"
                      )} F CFP avec PayZen`}
                </button>

                <p className="mt-3 text-center text-sm text-slate-500">
                  Le carnet sera activé après confirmation du paiement.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}