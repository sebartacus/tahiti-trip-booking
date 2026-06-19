"use client";

import { useState } from "react";

const examens = [
  { label: "Session du 10 juin 2026", value: "10 juin 2026", limite: "2 juin 2026" },
  { label: "Session du 24 juin 2026", value: "24 juin 2026", limite: "16 juin 2026" },
  { label: "Je choisirai plus tard", value: "Plus tard", limite: "" },
];

const creneauxIndividuels = [
  "07h00 - 09h00",
  "09h00 - 11h00",
  "11h00 - 13h00",
  "13h00 - 15h00",
  "15h00 - 17h00",
];

const creneauxCommuns = [
  "07h00 - 11h00",
  "09h00 - 13h00",
  "11h00 - 15h00",
  "13h00 - 17h00",
];

function isMercredi(date: string) {
  if (!date) return false;

  const [year, month, day] = date.split("-").map(Number);
  const localDate = new Date(year, month - 1, day);

  return localDate.getDay() === 3;
}

export default function PermisPage() {
  const [formule, setFormule] = useState("");
  const [session, setSession] = useState("");
  const [limiteDossier, setLimiteDossier] = useState("");
  const [reservation, setReservation] = useState("");
  const [dateCours, setDateCours] = useState("");
  const [typeCours, setTypeCours] = useState("");
  const [creneau, setCreneau] = useState("");

  const mercredi = isMercredi(dateCours);

  const creneauxDisponibles =
    typeCours === "commun"
      ? mercredi
        ? ["13h00 - 17h00"]
        : creneauxCommuns
      : mercredi
        ? ["13h00 - 15h00", "15h00 - 17h00"]
        : creneauxIndividuels;

  return (
    <main className="min-h-screen bg-sky-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">⚓ Permis Côtier</h1>

        {!formule && (
          <div className="grid md:grid-cols-2 gap-6">
            <button
              onClick={() => setFormule("Classique")}
              className="bg-sky-800 rounded-2xl p-6 text-left hover:bg-sky-700"
            >
              <h2 className="text-2xl font-bold mb-4">Formule Classique</h2>
              <p className="text-4xl font-bold mb-4">25 000 XPF</p>
              <p>Application de code, cours pratique, dossier, examen.</p>
              <p className="mt-4 text-red-200">Timbres fiscaux à fournir.</p>
            </button>

            <button
              onClick={() => setFormule("Sérénité")}
              className="bg-cyan-700 rounded-2xl p-6 text-left hover:bg-cyan-600"
            >
              <h2 className="text-2xl font-bold mb-4">Formule Sérénité</h2>
              <p className="text-4xl font-bold mb-4">33 000 XPF</p>
              <p>Application de code, cours pratique, dossier, examen.</p>
              <p className="mt-4 text-green-200">
                Tahiti Trip Fishing s&apos;occupe des timbres fiscaux.
              </p>
            </button>
          </div>
        )}

        {formule && !session && (
          <section className="bg-sky-800 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">
              Formule choisie : {formule}
            </h2>

            <h3 className="text-xl mb-4">
              Choisissez votre date d&apos;examen
            </h3>

            <div className="space-y-4">
              {examens.map((examen) => (
                <button
                  key={examen.value}
                  onClick={() => {
                    setSession(examen.value);
                    setLimiteDossier(examen.limite);
                  }}
                  className="w-full bg-cyan-600 p-4 rounded-xl hover:bg-cyan-500"
                >
                  {examen.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {formule && session && !reservation && (
          <section className="bg-sky-800 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">
              Date d&apos;examen : {session}
            </h2>

            {limiteDossier ? (
              <p className="mb-6 text-yellow-200">
                Dossier complet à retourner par mail au plus tard le{" "}
                <strong>{limiteDossier}</strong>.
              </p>
            ) : (
              <p className="mb-6 text-yellow-200">
                Le dossier devra être retourné au maximum 8 jours avant la date
                d&apos;examen choisie.
              </p>
            )}

            <p className="mb-6">
              Voulez-vous réserver votre cours pratique maintenant ?
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => setReservation("maintenant")}
                className="bg-green-600 p-4 rounded-xl hover:bg-green-500"
              >
                Réserver maintenant
              </button>

              <button
                onClick={() => setReservation("plus tard")}
                className="bg-slate-600 p-4 rounded-xl hover:bg-slate-500"
              >
                Je réserverai plus tard
              </button>
            </div>
          </section>
        )}

        {reservation === "maintenant" && !dateCours && (
          <section className="bg-cyan-900 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">
              Choisissez la date du cours pratique
            </h2>

            <input
              type="date"
              value={dateCours}
              onChange={(e) => setDateCours(e.target.value)}
              className="w-full p-4 rounded-xl text-black"
            />
          </section>
        )}

        {reservation === "maintenant" && dateCours && !typeCours && (
          <section className="bg-cyan-900 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">Type de cours</h2>

            <div className="space-y-4">
              <button
                onClick={() => setTypeCours("individuel")}
                className="w-full bg-blue-600 p-4 rounded-xl hover:bg-blue-500"
              >
                Cours individuel — 1 personne — 2h
              </button>

              <button
                onClick={() => setTypeCours("commun")}
                className="w-full bg-blue-600 p-4 rounded-xl hover:bg-blue-500"
              >
                Cours commun — 2 personnes maximum — 4h
              </button>
            </div>
          </section>
        )}

        {reservation === "maintenant" && dateCours && typeCours && !creneau && (
          <section className="bg-cyan-900 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">
              Choisissez votre créneau
            </h2>

            {mercredi && (
              <p className="mb-6 text-yellow-200">
                Le mercredi matin est réservé aux examens. Les cours pratiques
                sont disponibles uniquement à partir de 13h00.
              </p>
            )}

            <div className="space-y-4">
              {creneauxDisponibles.map((horaire) => (
                <button
                  key={horaire}
                  onClick={() => setCreneau(horaire)}
                  className="w-full bg-blue-600 p-4 rounded-xl hover:bg-blue-500"
                >
                  {horaire}
                </button>
              ))}
            </div>
          </section>
        )}

        {reservation === "maintenant" && dateCours && typeCours && creneau && (
          <section className="bg-green-800 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">
              Résumé de votre réservation
            </h2>

            <p>Formule : {formule}</p>
            <p>Date d&apos;examen : {session}</p>
            <p>Date limite dossier : {limiteDossier || "À définir"}</p>
            <p>Date du cours pratique : {dateCours}</p>
            <p>
              Type de cours :{" "}
              {typeCours === "individuel" ? "Cours individuel" : "Cours commun"}
            </p>
            <p>Créneau : {creneau}</p>

            <button className="mt-6 w-full bg-yellow-500 text-black font-bold p-4 rounded-xl">
              Continuer vers le paiement
            </button>
          </section>
        )}

        {reservation === "plus tard" && (
          <section className="bg-cyan-900 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">Réservation plus tard</h2>

            <p className="mb-4">
              Votre permis sera valable 6 mois à partir de la date
              d&apos;achat.
            </p>

            <p className="mb-6">
              Vous pourrez réserver votre cours pratique plus tard depuis votre
              espace client.
            </p>

            <button className="mt-6 w-full bg-yellow-500 text-black font-bold p-4 rounded-xl">
              Continuer vers le paiement
            </button>
          </section>
        )}
      </div>
    </main>
  );
}