"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function ReprendreReservationPage() {
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [reservation, setReservation] = useState<any>(null);
const [examen, setExamen] = useState("");
const [dateCours, setDateCours] = useState<Date | null>(null);
const [creneau, setCreneau] = useState("");
const mercredi = dateCours?.getDay() === 3;
const [creneauxReserves, setCreneauxReserves] = useState<string[]>([]);
  const [erreur, setErreur] = useState("");
const [message, setMessage] = useState("");
const [datesExamensBloques, setDatesExamensBloques] = useState<string[]>([]);

useEffect(() => {
  async function chargerExamensBloques() {
    const { data, error } = await supabase
      .from("examens_bloques")
      .select("date_examen");

    if (error) {
      console.error(error);
      return;
    }

    setDatesExamensBloques((data || []).map((item) => item.date_examen));
  }

  chargerExamensBloques();
}, []);
const joursFeriesPolynesie = [
  "2026-01-01",
  "2026-03-05",
  "2026-04-03",
  "2026-04-06",
  "2026-05-01",
  "2026-05-08",
  "2026-05-14",
  "2026-05-25",
  "2026-06-29",
  "2026-07-14",
  "2026-08-15",
  "2026-11-01",
  "2026-11-11",
  "2026-12-25",
];

function formatDateISO(date: Date) {
  return date.toISOString().split("T")[0];
}

function formatDateFR(date: Date) {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ajouterJours(date: Date, jours: number) {
  const nouvelleDate = new Date(date);
  nouvelleDate.setDate(nouvelleDate.getDate() + jours);
  return nouvelleDate;
}

function genererExamens() {
  const aujourdHui = new Date();
  aujourdHui.setHours(0, 0, 0, 0);

  const examensDisponibles = [];
  let date = new Date(aujourdHui);

  while (examensDisponibles.length < 4) {
    date.setDate(date.getDate() + 1);

    if (date.getDay() !== 3) continue;

    let dateExamen = new Date(date);

    if (joursFeriesPolynesie.includes(formatDateISO(dateExamen))) {
      dateExamen = ajouterJours(dateExamen, 1);
    }

    const limiteInscription = ajouterJours(dateExamen, -8);

    if (aujourdHui <= limiteInscription) {
      examensDisponibles.push({
  label: `Session du ${formatDateFR(dateExamen)}`,
  value: formatDateFR(dateExamen),
  limite: formatDateFR(limiteInscription),
  iso: formatDateISO(dateExamen),
});
    }
  }

  return [
    ...examensDisponibles,
    { label: "Je choisirai plus tard", value: "Plus tard", limite: "" },
  ];
}

const examens = genererExamens().filter(
  (examen) =>
    examen.value === "Plus tard" ||
    !datesExamensBloques.includes(examen.iso)
);

async function chargerCreneauxReserves(date: Date) {
  const dateFormatee = date.toLocaleDateString("fr-FR");

  const { data, error } = await supabase
    .from("reservations")
    .select("creneau")
    .eq("date_cours", dateFormatee);

  if (error) {
    console.error(error);
    return;
  }

  const reserves = (data || [])
  .map((reservation) => reservation.creneau)
  .filter(Boolean);

const bloques = new Set<string>();

reserves.forEach((creneau) => {
  bloques.add(creneau);

  if (creneau === "13h00 - 17h00") {
    bloques.add("13h00 - 15h00");
    bloques.add("15h00 - 17h00");
  }

  if (
    creneau === "13h00 - 15h00" ||
    creneau === "15h00 - 17h00"
  ) {
    bloques.add("13h00 - 17h00");
  }
});

setCreneauxReserves([...bloques]);
}  
async function rechercherReservation() {
    setErreur("");
    setReservation(null);

    let requete = supabase
  .from("reservations")
  .select("*");

if (email.trim()) {
  requete = requete.eq("email", email.trim());
}

if (telephone.trim()) {
  requete = requete.eq("telephone", telephone.trim());
}

const { data, error } = await requete
  .order("created_at", { ascending: false })
  .limit(1);

if (error || !data || data.length === 0) {
  setErreur("Aucune réservation trouvée avec ces informations.");
  return;
}

setReservation(data[0]);
setExamen(data[0].examen || "");
setCreneau(data[0].creneau || "");
  }
async function mettreAJourReservation() {
  if (!reservation) return;

  if (examen && examen !== "Plus tard" && !dateCours && !reservation.date_cours) {
    alert("Veuillez choisir une date de cours pratique avant de valider votre réservation.");
    return;
  }

  

  if (dateCours && !creneau) {
    alert("Veuillez choisir un créneau horaire.");
    return;
  }
  const { error } = await supabase
    .from("reservations")
    .update({
  examen,
  date_cours: dateCours
    ? dateCours.toLocaleDateString("fr-FR")
    : reservation.date_cours,
  creneau: creneau || reservation.creneau,
})
    .eq("id", reservation.id);

  if (error) {
    console.error(error);
    alert("Erreur lors de la mise à jour.");
    return;
  }

setReservation({
  ...reservation,
  examen,
  date_cours: dateCours
    ? dateCours.toLocaleDateString("fr-FR")
    : reservation.date_cours,
  creneau: creneau || reservation.creneau,
});  
setMessage("Réservation mise à jour avec succès.");
}

  return (
    <main className="min-h-screen bg-sky-950 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">
          Reprendre ma réservation
        </h1>

        <div className="bg-white text-black rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">
            Retrouvez votre dossier
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <input
              className="p-3 rounded-xl border"
              placeholder="Email utilisé lors de l'achat"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="p-3 rounded-xl border"
              placeholder="Téléphone utilisé lors de l'achat"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
            />
          </div>

          {erreur && (
            <div className="mt-4 bg-red-100 text-red-700 p-4 rounded-xl">
              {erreur}
            </div>
          )}

          <button
            onClick={rechercherReservation}
            className="mt-6 w-full bg-yellow-500 text-black font-bold p-4 rounded-xl"
          >
            Rechercher ma réservation
          </button>
        </div>

        {reservation && (
          <div className="mt-8 bg-green-100 text-green-900 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">
              Réservation retrouvée
            </h2>
<div className="mb-6 bg-white rounded-xl p-4">
  <p>{reservation.examen ? "✅ Examen choisi" : "❌ Examen à choisir"}</p>

  <p>
    {reservation.date_cours
      ? "✅ Cours pratique réservé"
      : "❌ Cours pratique à réserver"}
  </p>

  <p>
    {reservation.creneau
      ? "✅ Créneau réservé"
      : "❌ Créneau à choisir"}
  </p>
</div>

            <p><strong>Nom :</strong> {reservation.prenom} {reservation.nom}</p>
            <p><strong>Formule :</strong> {reservation.formule}</p>
            <div className="mt-4">
  <label className="font-bold block mb-2">
    Date d'examen
  </label>

  <select
    className="w-full border rounded-xl p-3"
    value={examen}
onChange={(e) => setExamen(e.target.value)}
  >
    <option value="">Choisir</option>
{examens
  .filter((e) => e.value !== "Plus tard")
  .map((examen) => (
    <option key={examen.value} value={examen.value}>
      {examen.value}
    </option>
))}
  </select>
</div>
<div className="mt-6 bg-white text-black rounded-2xl p-4">
  <h3 className="text-xl font-bold mb-4">
    Choisir la date du cours pratique
  </h3>

  <Calendar
  onChange={(value) => {
    const date = value as Date;
    setDateCours(date);
    chargerCreneauxReserves(date);
  }}
  value={dateCours}
  minDate={new Date()}
  locale="fr-FR"
  className="w-full border-none"
/>
{dateCours && (
  <p className="mt-4 font-bold">
    Date choisie : {dateCours.toLocaleDateString("fr-FR")}
  </p>
)}
</div>
<div className="mt-6">
  <label className="font-bold block mb-2">
    Créneau horaire
  </label>

  <select
    className="w-full border rounded-xl p-3"
    value={creneau}
    onChange={(e) => setCreneau(e.target.value)}
  >
    <option value="">Choisir un créneau</option>
    {(mercredi
  ? [
  "13h00 - 15h00",
  "15h00 - 17h00",
  "13h00 - 17h00",
]
  : [
      "07h00 - 09h00",
      "09h00 - 11h00",
      "13h00 - 15h00",
      "15h00 - 17h00",
"13h00 - 17h00",
    ]
)
  .filter((horaire) => !creneauxReserves.includes(horaire))
  .map((horaire) => (
    <option key={horaire} value={horaire}>
      {horaire}
    </option>
  ))}
  </select>
</div>            
<p><strong>Cours :</strong> {reservation.date_cours || "à planifier"}</p>
            <p><strong>Créneau :</strong> {reservation.creneau || "à planifier"}</p>
            <p><strong>Statut :</strong> {reservation.statut}</p>
<button
  onClick={mettreAJourReservation}
  className="mt-6 w-full bg-yellow-500 text-black font-bold p-4 rounded-xl"
>
  Mettre à jour ma réservation
</button>
{message && (
  <div className="mt-4 bg-green-200 text-green-900 p-4 rounded-xl">
    {message}
  </div>
)}
          </div>
        )}
      </div>
    </main>
  );
}