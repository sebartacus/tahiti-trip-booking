"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [filtreStatut, setFiltreStatut] = useState("Tous");
  const [motDePasse, setMotDePasse] = useState("");
  const [accesAutorise, setAccesAutorise] = useState(false);

  const [dateExamenBloquee, setDateExamenBloquee] = useState("");
  const [motifBlocage, setMotifBlocage] = useState("");
  const [examensBloques, setExamensBloques] = useState<any[]>([]);

  useEffect(() => {
    chargerReservations();
    chargerExamensBloques();
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

  async function chargerExamensBloques() {
    const { data, error } = await supabase
      .from("examens_bloques")
      .select("*")
      .order("date_examen", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setExamensBloques(data || []);
  }

  async function bloquerDateExamen() {
    if (!dateExamenBloquee) {
      alert("Veuillez choisir une date à bloquer.");
      return;
    }

    const { error } = await supabase.from("examens_bloques").insert([
      {
        date_examen: dateExamenBloquee,
        motif: motifBlocage || "Date bloquée manuellement",
      },
    ]);

    if (error) {
      console.error(error);
      alert("Impossible de bloquer cette date.");
      return;
    }

    setDateExamenBloquee("");
    setMotifBlocage("");
    chargerExamensBloques();
  }

  async function debloquerDateExamen(id: string) {
    const { error } = await supabase
      .from("examens_bloques")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Impossible de débloquer cette date.");
      return;
    }

    chargerExamensBloques();
  }

  async function ouvrirDocument(path: string | null) {
    if (!path) return;

    const { data, error } = await supabase.storage
      .from("documents-permis")
      .createSignedUrl(path, 60 * 10);

    if (error) {
      console.error(error);
      alert("Impossible d’ouvrir le document.");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  async function modifierStatut(id: number, statut: string) {
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

  const reservationsFiltrees = reservations.filter((reservation) =>
    filtreStatut === "Tous" ? true : reservation.statut === filtreStatut
  );

  if (!accesAutorise) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 flex items-center justify-center">
        <div className="bg-white text-slate-900 rounded-2xl p-6 max-w-md w-full shadow">
          <h1 className="text-3xl font-bold mb-6">Accès admin</h1>

          <input
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            placeholder="Mot de passe"
            className="w-full border rounded-xl p-3 mb-4"
          />

          <button
            onClick={() => {
              if (
                motDePasse ===
                (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123")
              ) {
                setAccesAutorise(true);
              } else {
                alert("Mot de passe incorrect.");
              }
            }}
            className="w-full cursor-pointer bg-sky-800 text-white font-bold p-3 rounded-xl"
          >
            Entrer
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 p-4 md:p-8">
      <h1 className="text-3xl md:text-4xl font-bold mb-6">
        Réservations Permis Côtier
      </h1>

      <section className="bg-white rounded-2xl p-4 md:p-6 mb-6 shadow">
        <h2 className="text-2xl font-bold mb-4">Dates d’examen bloquées</h2>

        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <input
            type="date"
            value={dateExamenBloquee}
            onChange={(e) => setDateExamenBloquee(e.target.value)}
            className="border rounded-xl p-3"
          />

          <input
            value={motifBlocage}
            onChange={(e) => setMotifBlocage(e.target.value)}
            placeholder="Motif"
            className="border rounded-xl p-3"
          />

          <button
            onClick={bloquerDateExamen}
            className="cursor-pointer bg-red-600 text-white font-bold rounded-xl p-3"
          >
            Bloquer cette date
          </button>
        </div>

        <div className="space-y-2">
          {examensBloques.length === 0 && (
            <p className="text-slate-500">Aucune date bloquée.</p>
          )}

          {examensBloques.map((examen) => (
            <div
              key={examen.id}
              className="bg-slate-100 rounded-xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
            >
              <div>
                <p className="font-bold">
                  {examen.date_examen.split("-").reverse().join("/")}
                </p>
                <p className="text-sm text-slate-600">{examen.motif}</p>
              </div>

              <button
                onClick={() => debloquerDateExamen(examen.id)}
                className="cursor-pointer bg-slate-700 text-white rounded-xl px-4 py-2"
              >
                Débloquer
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl p-4 font-bold">
          Total : {reservations.length}
        </div>

        <div className="bg-yellow-100 text-yellow-800 rounded-xl p-4 font-bold">
          En attente :{" "}
          {reservations.filter((r) => r.statut === "En attente").length}
        </div>

        <div className="bg-green-100 text-green-800 rounded-xl p-4 font-bold">
          Validés : {reservations.filter((r) => r.statut === "Validé").length}
        </div>

        <div className="bg-blue-100 text-blue-800 rounded-xl p-4 font-bold">
          Permis obtenus :{" "}
          {reservations.filter((r) => r.statut === "Permis obtenu").length}
        </div>
      </div>

      <div className="mb-6 bg-white rounded-xl p-4 shadow">
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

      <div className="block lg:hidden space-y-4">
        {reservationsFiltrees.map((reservation) => (
          <div key={reservation.id} className="bg-white rounded-2xl p-4 shadow">
            <h2 className="text-xl font-bold mb-2">
              {reservation.prenom} {reservation.nom}
            </h2>

            <p>
              <strong>Participant 2 :</strong>{" "}
              {reservation.prenom2 && reservation.nom2
                ? `${reservation.prenom2} ${reservation.nom2}`
                : "-"}
            </p>
            <p>
              <strong>Téléphone :</strong> {reservation.telephone}
            </p>
            <p>
              <strong>Email :</strong> {reservation.email}
            </p>
            <p>
              <strong>Formule :</strong> {reservation.formule}
            </p>
            <p>
              <strong>Examen :</strong> {reservation.examen}
            </p>
            <p>
              <strong>Cours :</strong> {reservation.date_cours || "-"}
            </p>
            <p>
              <strong>Créneau :</strong> {reservation.creneau || "-"}
            </p>
            <p>
              <strong>Paiement :</strong>{" "}
              {reservation.paiement_effectue ? "Payé" : "Non payé"}
            </p>

            <div className="mt-4">
              <label className="font-bold block mb-2">Statut</label>
              <select
                value={reservation.statut || "En attente"}
                onChange={(e) => modifierStatut(reservation.id, e.target.value)}
                className="w-full cursor-pointer rounded-xl border p-3 font-bold"
              >
                <option>En attente</option>
                <option>Validé</option>
                <option>Incomplet</option>
                <option>Permis obtenu</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => ouvrirDocument(reservation.certificat_url)}
                className="cursor-pointer bg-green-600 text-white rounded-xl p-2"
              >
                Certificat
              </button>
              <button
                onClick={() => ouvrirDocument(reservation.formulaire_url)}
                className="cursor-pointer bg-green-600 text-white rounded-xl p-2"
              >
                Formulaire
              </button>
              <button
                onClick={() => ouvrirDocument(reservation.photo_url)}
                className="cursor-pointer bg-green-600 text-white rounded-xl p-2"
              >
                Photo
              </button>
              <button
                onClick={() => ouvrirDocument(reservation.identite_url)}
                className="cursor-pointer bg-green-600 text-white rounded-xl p-2"
              >
                Identité
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden lg:block overflow-x-auto bg-white rounded-xl shadow">
        <table className="min-w-[1400px] w-full text-sm">
          <thead className="bg-sky-800 text-white">
            <tr>
              <th className="p-3 text-left">Nom</th>
              <th className="p-3 text-left">Participant 2</th>
              <th className="p-3 text-left">Téléphone</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Formule</th>
              <th className="p-3 text-left">Examen</th>
              <th className="p-3 text-left">Cours</th>
              <th className="p-3 text-left">Créneau</th>
              <th className="p-3 text-left">Paiement</th>
              <th className="p-3 text-left">Statut</th>
              <th className="p-3 text-left">Documents</th>
            </tr>
          </thead>

          <tbody>
            {reservationsFiltrees.map((reservation) => (
              <tr key={reservation.id} className="border-b hover:bg-slate-50">
                <td className="p-3">
                  {reservation.prenom} {reservation.nom}
                </td>
                <td className="p-3">
                  {reservation.prenom2 && reservation.nom2
                    ? `${reservation.prenom2} ${reservation.nom2}`
                    : "-"}
                </td>
                <td className="p-3">{reservation.telephone}</td>
                <td className="p-3">{reservation.email}</td>
                <td className="p-3">{reservation.formule}</td>
                <td className="p-3">{reservation.examen}</td>
                <td className="p-3">{reservation.date_cours || "-"}</td>
                <td className="p-3">{reservation.creneau || "-"}</td>
                <td className="p-3">
                  {reservation.paiement_effectue ? "Payé" : "Non payé"}
                </td>
                <td className="p-3">
                  <select
                    value={reservation.statut || "En attente"}
                    onChange={(e) =>
                      modifierStatut(reservation.id, e.target.value)
                    }
                    className="cursor-pointer rounded-xl border p-2 font-bold"
                  >
                    <option>En attente</option>
                    <option>Validé</option>
                    <option>Incomplet</option>
                    <option>Permis obtenu</option>
                  </select>
                </td>
                <td className="p-3">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => ouvrirDocument(reservation.certificat_url)} className="cursor-pointer bg-green-600 text-white px-3 py-1 rounded">Certificat</button>
                    <button onClick={() => ouvrirDocument(reservation.formulaire_url)} className="cursor-pointer bg-green-600 text-white px-3 py-1 rounded">Formulaire</button>
                    <button onClick={() => ouvrirDocument(reservation.photo_url)} className="cursor-pointer bg-green-600 text-white px-3 py-1 rounded">Photo</button>
                    <button onClick={() => ouvrirDocument(reservation.identite_url)} className="cursor-pointer bg-green-600 text-white px-3 py-1 rounded">Identité</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}