"use client";

import { useState } from "react";
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
alert("Réservation mise à jour.");
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
    <option value="10 juin 2026">10 juin 2026</option>
    <option value="24 juin 2026">24 juin 2026</option>
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
          </div>
        )}
      </div>
    </main>
  );
}