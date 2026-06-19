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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}