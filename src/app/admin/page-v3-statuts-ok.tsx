"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [reservations, setReservations] = useState<any[]>([]);

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
  const { error } = await supabase
    .from("reservations")
    .update({ statut })
    .eq("id", id);

  if (error) {
    console.error(error);
    return;
  }

  chargerReservations();
}

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="text-4xl font-bold mb-8">
        Réservations Permis Côtier
      </h1>

      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded-xl overflow-hidden">
          <thead className="bg-sky-800 text-white">
            <tr>
              <th className="p-3 text-left">Nom</th>
              <th className="p-3 text-left">Téléphone</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Formule</th>
              <th className="p-3 text-left">Examen</th>
              <th className="p-3 text-left">Cours</th>
              <th className="p-3 text-left">Créneau</th>
<th className="p-3 text-left">Statut</th>
<th className="p-3 text-left">Certificat</th>
<th className="p-3 text-left">Formulaire</th>
<th className="p-3 text-left">Photo</th>
<th className="p-3 text-left">Identité</th>
            </tr>
          </thead>

          <tbody>
            {reservations.map((reservation) => (
              <tr
                key={reservation.id}
                className="border-b hover:bg-slate-50"
              >
                <td className="p-3">
                  {reservation.prenom} {reservation.nom}
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
                  {reservation.date_cours}
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
      : "bg-yellow-100 text-yellow-800"
  }`}
>
    <option>En attente</option>
    <option>Validé</option>
    <option>Incomplet</option>
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
  {reservation.formulaire_url ? (
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
  {reservation.formulaire_url ? (
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