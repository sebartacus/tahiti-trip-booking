"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

type Participant = {
  prenom: string;
  nom: string;
  telephone?: string;
  email?: string;
  age: string;
  type: "mise_eau" | "observateur";
  tailleCombinaison: string;
  pointurePalmes: string;
  materielPerso: boolean;
};

const CAPACITE_MISE_EAU = 6;
const CAPACITE_OBSERVATEUR = 2;

const PRIX_MISE_EAU = 15000;
const PRIX_OBSERVATEUR = 8500;
const PRIX_ENFANT_OBSERVATEUR = 7000;
const DATE_DEBUT_BALEINES = new Date("2026-07-20");
const DATE_FIN_BALEINES = new Date("2026-11-20");

function dateAutorisee(date: Date) {
  return date >= DATE_DEBUT_BALEINES && date <= DATE_FIN_BALEINES;
}

export default function BaleinesPage() {
  const [dateSortie, setDateSortie] = useState<Date | null>(null);
const [tour, setTour] = useState("");
const [responsablePrenom, setResponsablePrenom] = useState("");
const [responsableNom, setResponsableNom] = useState("");
const [responsableTelephone, setResponsableTelephone] = useState("");
const [responsableEmail, setResponsableEmail] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
const [erreur, setErreur] = useState("");
const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);

  const totalMiseEau = participants.filter((p) => p.type === "mise_eau").length;

const totalObservateurAdulte = participants.filter(
  (p) => p.type === "observateur" && p.age === "+12 ans"
).length;

const totalObservateurEnfant = participants.filter(
  (p) =>
    p.type === "observateur" &&
    (p.age === "6/10 ans" || p.age === "10/12 ans")
).length;

const totalObservateur = totalObservateurAdulte + totalObservateurEnfant;

const placesRestantesMiseEau = CAPACITE_MISE_EAU - totalMiseEau;
const placesRestantesObservateur = CAPACITE_OBSERVATEUR - totalObservateur;

const total =
  totalMiseEau * PRIX_MISE_EAU +
  totalObservateurAdulte * PRIX_OBSERVATEUR +
  totalObservateurEnfant * PRIX_ENFANT_OBSERVATEUR;

  function ajouterParticipant() {
  if (
    totalMiseEau >= CAPACITE_MISE_EAU &&
    totalObservateur >= CAPACITE_OBSERVATEUR
  ) {
    return;
  }

  const typeParDefaut =
    totalMiseEau < CAPACITE_MISE_EAU ? "mise_eau" : "observateur";

  setParticipants([
    ...participants,
    {
  prenom: "",
  nom: "",
  telephone: "",
  email: "",
  age: "+12 ans",
  type: typeParDefaut,
  tailleCombinaison: "",
  pointurePalmes: "",
  materielPerso: false,
},
  ]);
}

  function modifierParticipant(index: number, champ: keyof Participant, valeur: any) {
    const nouveauxParticipants = [...participants];

    nouveauxParticipants[index] = {
      ...nouveauxParticipants[index],
      [champ]: valeur,
    };

    if (
      champ === "age" &&
      (valeur === "6/10 ans" || valeur === "10/12 ans") &&
      nouveauxParticipants[index].type === "mise_eau"
    ) {
      nouveauxParticipants[index].type = "observateur";
    }

    setParticipants(nouveauxParticipants);
  }

  function supprimerParticipant(index: number) {
    setParticipants(participants.filter((_, i) => i !== index));
  }
async function reserverSortie() {
  setErreur("");

  if (!dateSortie) {
    setErreur("Veuillez choisir une date.");
    return;
  }

  if (!tour) {
    setErreur("Veuillez choisir un départ.");
    return;
  }

  if (participants.length === 0) {
    setErreur("Ajoutez au moins un participant.");
    return;
  }
for (let i = 0; i < participants.length; i++) {
  const participant = participants[i];

  if (!participant.prenom.trim()) {
    setErreur(`Veuillez renseigner le prénom du participant ${i + 1}.`);
    return;
  }

  if (!participant.nom.trim()) {
    setErreur(`Veuillez renseigner le nom du participant ${i + 1}.`);
    return;
  }

  if (!participant.age) {
    setErreur(`Veuillez choisir l'âge du participant ${i + 1}.`);
    return;
  }

  if (!participant.type) {
    setErreur(`Veuillez choisir le type de participation du participant ${i + 1}.`);
    return;
  }

  if (!participant.materielPerso && !participant.tailleCombinaison) {
    setErreur(`Veuillez choisir la taille de combinaison du participant ${i + 1}.`);
    return;
  }

  if (!participant.materielPerso && !participant.pointurePalmes) {
    setErreur(`Veuillez choisir la pointure de palmes du participant ${i + 1}.`);
    return;
  }
}

  setEnregistrementEnCours(true);

const responsable = participants[0];

const { data: reservationCreee, error: erreurReservation } = await supabase
  .from("reservations_baleines")
  .insert([
    {
      date_sortie: dateSortie.toLocaleDateString("fr-FR"),
      tour,
      prenom: responsable.prenom,
      nom: responsable.nom,
      telephone: responsable.telephone,
      email: responsable.email,
      participants,
      total,
      paiement_effectue: false,
      statut: "En attente",
    },
  ])
  .select()
  .single();

if (erreurReservation) {
  console.error(erreurReservation);
  setErreur("Erreur lors de l'enregistrement de la réservation.");
  setEnregistrementEnCours(false);
  return;
}
const reponsePayzen = await fetch("/api/payzen", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
  reservationId: reservationCreee.id,
  montant: total,
  email: responsable.email,
  type: "baleines",
  dateSortie: dateSortie.toLocaleDateString("fr-FR"),
  tour,
  participants,
  telephone: responsable.telephone,
  nom: responsable.nom,
  prenom: responsable.prenom,
}),
});

const paiement = await reponsePayzen.json();

if (!reponsePayzen.ok) {
  console.error(paiement);
  setErreur("Erreur lors de la préparation du paiement.");
  setEnregistrementEnCours(false);
  return;
}

const formulaire = document.createElement("form");
formulaire.method = "POST";
formulaire.action = paiement.url;

Object.entries(paiement.champs).forEach(([nom, valeur]) => {
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = nom;
  input.value = String(valeur);
  formulaire.appendChild(input);
});

document.body.appendChild(formulaire);
formulaire.submit();
}

  return (
    <main className="min-h-screen bg-sky-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <a
          href="/"
          className="inline-block mb-6 cursor-pointer bg-slate-700 hover:bg-slate-600 px-5 py-3 rounded-xl"
        >
          ← Retour
        </a>

        <h1 className="text-4xl font-bold mb-4">🐋 Whale Watching</h1>

        <p className="mb-8 text-slate-300">
          Réservez votre sortie baleines. Mise à l’eau limitée à 6 personnes,
          observateurs limités à 2 personnes.
        </p>

        <section className="bg-cyan-900 rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Choisissez votre date</h2>

          <div className="bg-white text-black rounded-2xl p-4">
            <Calendar
              onChange={(value) => setDateSortie(value as Date)}
              value={dateSortie}
              minDate={DATE_DEBUT_BALEINES}
maxDate={DATE_FIN_BALEINES}
tileDisabled={({ date }) => !dateAutorisee(date)}
              locale="fr-FR"
              className="w-full border-none"
            />
          </div>

          {dateSortie && (
  <div className="mt-4 bg-white text-black rounded-xl p-4">
    <p className="font-bold mb-4">
      Date choisie : {dateSortie.toLocaleDateString("fr-FR")}
    </p>

    <label className="font-bold block mb-3">
  Choisissez votre départ
</label>

<div className="grid md:grid-cols-2 gap-4 mb-4">
  <button
    type="button"
    onClick={() => setTour("matin")}
    className={`cursor-pointer rounded-2xl p-4 text-left font-bold ${
      tour === "matin"
        ? "bg-green-600 text-white"
        : "bg-sky-100 hover:bg-sky-200"
    }`}
  >
    <div className="text-xl">🌅 Départ 07h00</div>
    <div className="text-sm font-normal mt-1">Sortie d’environ 4h</div>
  </button>

  <button
    type="button"
    onClick={() => setTour("apres-midi")}
    className={`cursor-pointer rounded-2xl p-4 text-left font-bold ${
      tour === "apres-midi"
        ? "bg-green-600 text-white"
        : "bg-sky-100 hover:bg-sky-200"
    }`}
  >
    <div className="text-xl">☀️ Départ 13h15</div>
    <div className="text-sm font-normal mt-1">Sortie d’environ 4h</div>
  </button>
</div>

    {tour && (
      <>
        <p>Places mise à l’eau restantes : {placesRestantesMiseEau}</p>
        <p>Places observateurs restantes : {placesRestantesObservateur}</p>
      </>
    )}
  </div>
)}
        </section>

        <section className="bg-white text-black rounded-2xl p-6">
  <h2 className="text-2xl font-bold mb-4">
    Participants
  </h2>

{participants.length === 0 && (
  <div className="bg-sky-100 border border-sky-300 rounded-xl p-4 mb-6">
    Aucun participant ajouté pour le moment.
    Cliquez sur “Ajouter un participant” pour commencer la réservation.
  </div>
)}          
<div className="space-y-6">
            {participants.map((participant, index) => {
              const enfantMoins12 =
                participant.age === "6/10 ans" || participant.age === "10/12 ans";

              return (
                <div key={index} className="border rounded-2xl p-4 bg-slate-50">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold">
  {index === 0
    ? "Participant 1 (responsable de la réservation)"
    : `Participant ${index + 1}`}
</h3>

                    {participants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => supprimerParticipant(index)}
                        className="cursor-pointer text-red-700 font-bold"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
  <input
    className="p-3 rounded-xl border"
    placeholder="Prénom"
    value={participant.prenom}
    onChange={(e) =>
      modifierParticipant(index, "prenom", e.target.value)
    }
  />

  <input
    className="p-3 rounded-xl border"
    placeholder="Nom"
    value={participant.nom}
    onChange={(e) =>
      modifierParticipant(index, "nom", e.target.value)
    }
  />

  {index === 0 && (
    <>
      <input
        className="p-3 rounded-xl border"
        placeholder="Téléphone"
        value={participant.telephone || ""}
        onChange={(e) =>
          modifierParticipant(index, "telephone", e.target.value)
        }
      />

      <input
        type="email"
        className="p-3 rounded-xl border"
        placeholder="E-mail"
        value={participant.email || ""}
        onChange={(e) =>
          modifierParticipant(index, "email", e.target.value)
        }
      />
    </>
  )}

                    <select
                      className="p-3 rounded-xl border"
                      value={participant.age}
                      onChange={(e) =>
                        modifierParticipant(index, "age", e.target.value)
                      }
                    >
                      <option>6/10 ans</option>
                      <option>10/12 ans</option>
                      <option>+12 ans</option>
                    </select>

                    <select
                      className="p-3 rounded-xl border"
                      value={participant.type}
                      onChange={(e) =>
                        modifierParticipant(
                          index,
                          "type",
                          e.target.value as "mise_eau" | "observateur"
                        )
                      }
                    >
                      <option value="mise_eau" disabled={enfantMoins12}>
                        Mise à l’eau — 15 000 FCP
                      </option>
                      <option value="observateur">
                        Observateur — {enfantMoins12 ? "7 000" : "8 500"} FCP
                      </option>
                    </select>

                    <select
  className="p-3 rounded-xl border"
  value={participant.tailleCombinaison}
  onChange={(e) =>
    modifierParticipant(index, "tailleCombinaison", e.target.value)
  }
>
  <option value="">Taille combinaison</option>
  <option>XS</option>
  <option>S</option>
  <option>M</option>
  <option>L</option>
  <option>XL</option>
  <option>XXL</option>
</select>

                    <select
  className="p-3 rounded-xl border"
  value={participant.pointurePalmes}
  onChange={(e) =>
    modifierParticipant(index, "pointurePalmes", e.target.value)
  }
>
  <option value="">Pointure palmes</option>
  <option>36/38</option>
  <option>39/41</option>
  <option>42/44</option>
  <option>45+</option>
</select>
                  </div>

                  <label className="mt-4 flex gap-3 items-center">
                    <input
                      type="checkbox"
                      checked={participant.materielPerso}
                      onChange={(e) =>
                        modifierParticipant(index, "materielPerso", e.target.checked)
                      }
                    />
                    <span>J’ai déjà mon matériel</span>
                  </label>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={ajouterParticipant}
            disabled={
  !dateSortie ||
  !tour ||
  (totalMiseEau >= CAPACITE_MISE_EAU &&
    totalObservateur >= CAPACITE_OBSERVATEUR)
}
            className="mt-6 w-full cursor-pointer bg-blue-600 text-white font-bold p-4 rounded-xl hover:bg-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {!dateSortie || !tour
  ? "Choisissez d’abord une date et un départ"
  : "Ajouter un participant"}
          </button>

          <div className="mt-6 bg-yellow-100 rounded-xl p-4">
  <h3 className="font-bold text-xl mb-3">
    Récapitulatif tarif
  </h3>

  {totalMiseEau > 0 && (
    <p>
      Mise à l’eau : {totalMiseEau} × 15 000 FCP ={" "}
      {(totalMiseEau * PRIX_MISE_EAU).toLocaleString("fr-FR")} FCP
    </p>
  )}

  {totalObservateurAdulte > 0 && (
    <p>
      Observateur adulte : {totalObservateurAdulte} × 8 500 FCP ={" "}
      {(totalObservateurAdulte * PRIX_OBSERVATEUR).toLocaleString("fr-FR")} FCP
    </p>
  )}

  {totalObservateurEnfant > 0 && (
    <p>
      Enfant observateur : {totalObservateurEnfant} × 7 000 FCP ={" "}
      {(totalObservateurEnfant * PRIX_ENFANT_OBSERVATEUR).toLocaleString("fr-FR")} FCP
    </p>
  )}

  <p className="font-bold text-xl mt-4">
    Total : {total.toLocaleString("fr-FR")} FCP
  </p>
</div>

          {erreur && (
  <div className="mt-6 bg-red-100 text-red-700 rounded-xl p-4">
    {erreur}
  </div>
)}

<button
  onClick={reserverSortie}
  disabled={enregistrementEnCours}
  className="mt-6 w-full cursor-pointer bg-yellow-500 text-black font-bold p-4 rounded-xl disabled:bg-slate-400 disabled:cursor-not-allowed"
>
  {enregistrementEnCours ? "Préparation..." : "Réserver ma sortie"}
</button>
        </section>
      </div>
    </main>
  );
}