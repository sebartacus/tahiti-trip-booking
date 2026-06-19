"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [reservations, setReservations] = useState<any[]>([]);
const [filtreStatut, setFiltreStatut] = useState("Tous");
const [motDePasse, setMotDePasse] = useState("");
const [accesAutorise, setAccesAutorise] = useState(false);

  useEffect(() => {
    chargerReservations();
  }, []);

  async function chargerReservations() {
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setReservations(data || []);
  }
async function ouvrirDocument(path: string | null) {
  if (!path) return;

  const { data, error } = await supabase.storage
    .from("documents-permis")
    .createSignedUrl(path, 60 * 10);

  if (error) {
    console.error(error);
    alert("Impossible d'ouvrir le document.");
    return;
  }

  window.open(data.signedUrl, "_blank");
}
async function modifierStatut(
  id: number,
  statut: string
) {
  const dateReussite =
    statut === "Permis obtenu"
      ? new Date().toLocaleDateString("fr-FR")
      : null;

  const { error } = await supabase
    .from("reservations")
    .update({
      statut,
      date_reussite_examen: dateReussite,
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    return;
  }

  chargerReservations();
}

if (!accesAutorise) {
  return (
    <main className="min-h-screen bg-slate-100 p-8 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6">
          Accès admin
        </h1>

        <input
          type="password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          placeholder="Mot de passe"
          className="w-full border rounded-xl p-3 mb-4"
        />

        <button
          onClick={() => {
            if (motDePasse === "admin123") {
              setAccesAutorise(true);
            } else {
              alert("Mot de passe incorrect.");
            }
          }}
          className="w-full bg-sky-800 text-white font-bold p-3 rounded-xl"
        >
          Entrer
        </button>
      </div>
    </main>
  );
}  
return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="text-4xl font-bold mb-8">
        Réservations Permis Côtier
      </h1>
<div className="mb-6 grid md:grid-cols-5 gap-4">
  <div className="bg-white rounded-xl p-4 font-bold">
    Total : {reservations.length}
  </div>

  <div className="bg-yellow-100 text-yellow-800 rounded-xl p-4 font-bold">
    En attente : {reservations.filter((r) => r.statut === "En attente").length}
  </div>

  <div className="bg-green-100 text-green-800 rounded-xl p-4 font-bold">
    Validés : {reservations.filter((r) => r.statut === "Validé").length}
  </div>

  <div className="bg-blue-100 text-blue-800 rounded-xl p-4 font-bold">
  Permis obtenus : {reservations.filter((r) => r.statut === "Permis obtenu").length}
</div>
</div>

<div className="mb-6">
  <label className="mr-3 font-semibold">Filtrer par statut :</label>

  <select
    value={filtreStatut}
    onChange={(e) => setFiltreStatut(e.target.value)}
    className="cursor-pointer rounded-xl border p-2"
  >
    <option>Tous</option>
    <option>En attente</option>
    <option>Validé</option>
    <option>Incomplet</option>
<option>Permis obtenu</option>
  </select>
</div>      
<div className="overflow-x-auto">
        <table className="w-full bg-white rounded-xl overflow-hidden">
          <thead className="bg-sky-800 text-white">
            <tr>
              <th className="p-3 text-left">Nom</th>
<th className="p-3 text-left">Participant 2</th>
              <th className="p-3 text-left">Téléphone</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Formule</th>
              <th className="p-3 text-left">Examen</th>
<th className="p-3 text-left">Réussite</th>
              <th className="p-3 text-left">Cours</th>
<th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Créneau</th>
<th className="p-3 text-left">Statut</th>
<th className="p-3 text-left">Certificat</th>
<th className="p-3 text-left">Formulaire</th>
<th className="p-3 text-left">Photo</th>
<th className="p-3 text-left">Identité</th>
            </tr>
          </thead>

          <tbody>
            {reservations
  .filter((reservation) =>
    filtreStatut === "Tous"
      ? true
      : reservation.statut === filtreStatut
  )
  .map((reservation) => (
              <tr
                key={reservation.id}
                className="border-b hover:bg-slate-50"
              >
                <td className="p-3">
                  {reservation.prenom} {reservation.nom}
                </td>
<td className="p-3">
  {reservation.prenom2 && reservation.nom2
    ? `${reservation.prenom2} ${reservation.nom2}`
    : "-"}
</td>

                <td className="p-3">
                  {reservation.telephone}
                </td>

                <td className="p-3">
                  {reservation.email}
                </td>

                <td className="p-3">
                  {reservation.formule}
                </td>

                <td className="p-3">
                  {reservation.examen}
                </td>
<td className="p-3">
  {reservation.date_reussite_examen || "-"}
</td>

                <td className="p-3">
                  {reservation.date_cours}
                </td>
<td className="p-3">
  {reservation.type_cours === "commun"
    ? "Cours commun"
    : "Individuel"}
</td>

                <td className="p-3">
                  {reservation.creneau}
                </td>
<td className="p-3">
  <select
  value={reservation.statut || "En attente"}
  onChange={(e) => modifierStatut(reservation.id, e.target.value)}
  className={`cursor-pointer rounded-xl border p-2 font-bold ${
  reservation.statut === "Validé"
    ? "bg-green-100 text-green-800"
    : reservation.statut === "Incomplet"
    ? "bg-red-100 text-red-800"
    : reservation.statut === "Permis obtenu"
    ? "bg-blue-100 text-blue-800"
    : "bg-yellow-100 text-yellow-800"
}`}
>
    <option>En attente</option>
    <option>Validé</option>
    <option>Incomplet</option>
<option>Permis obtenu</option>
  </select>
</td>
<td className="p-3">
  {reservation.certificat_url ? (
   <button
  type="button"
  onClick={() => ouvrirDocument(reservation.certificat_url)}
  className="cursor-pointer bg-green-600 text-white px-3 py-1 rounded hover:bg-green-500 transition"
>
  Voir
</button>
  ) : (
    "❌"
  )}
</td>

<td className="p-3">
  {reservation.formulaire_url ? (
    <button
      type="button"
      onClick={() => ouvrirDocument(reservation.formulaire_url)}
      className="cursor-pointer bg-green-600 text-white px-3 py-1 rounded hover:bg-green-500 transition"
    >
      Voir
    </button>
  ) : (
    "❌"
  )}
</td>

<td className="p-3">
  {reservation.photo_url ? (
    <button
      type="button"
      onClick={() => ouvrirDocument(reservation.photo_url)}
      className="cursor-pointer bg-green-600 text-white px-3 py-1 rounded hover:bg-green-500 transition"
    >
      Voir
    </button>
  ) : (
    "❌"
  )}
</td>

<td className="p-3">
  {reservation.identite_url ? (
    <button
      type="button"
      onClick={() => ouvrirDocument(reservation.identite_url)}
      className="cursor-pointer bg-green-600 text-white px-3 py-1 rounded hover:bg-green-500 transition"
    >
      Voir
    </button>
  ) : (
    "❌"
  )}
</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}