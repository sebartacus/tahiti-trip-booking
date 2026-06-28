"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Depart = "07:00" | "13:15";
type Role = "mise_eau" | "observateur";

type Participant = {
  prenom: string;
  nom: string;
  age: string;
  role: Role;
  materielPerso: boolean;
  tailleCombinaison: string;
  pointurePalmes: string;
};

const SAISON_DEBUT = "2026-07-20";
const SAISON_FIN = "2026-11-20";

const MAX_MISE_EAU = 6;
const MAX_OBSERVATEURS = 2;

const TARIF_MISE_EAU = 15000;
const TARIF_OBSERVATEUR = 8500;
const TARIF_ENFANT_OBSERVATEUR = 7000;

const TAILLES_COMBI = ["XS", "S", "M", "L", "XL", "XXL"];
const POINTURES_PALMES = [
  "34", "35", "36", "37", "38", "39", "40", "41",
  "42", "43", "44", "45", "46", "47", "48", "49",
];

function nouveauParticipant(): Participant {
  return {
    prenom: "",
    nom: "",
    age: "",
    role: "mise_eau",
    materielPerso: false,
    tailleCombinaison: "",
    pointurePalmes: "",
  };
}

function prixParticipant(p: Participant) {
  const age = Number(p.age);

  if (p.role === "mise_eau") return TARIF_MISE_EAU;
  if (age > 0 && age < 12) return TARIF_ENFANT_OBSERVATEUR;

  return TARIF_OBSERVATEUR;
}

function formatPrix(montant: number) {
  return `${montant.toLocaleString("fr-FR")} FCP`;
}

export default function PageBaleines() {
  const [date, setDate] = useState("");
  const [depart, setDepart] = useState<Depart>("07:00");

  const [responsablePrenom, setResponsablePrenom] = useState("");
  const [responsableNom, setResponsableNom] = useState("");
  const [responsableEmail, setResponsableEmail] = useState("");
  const [responsableTelephone, setResponsableTelephone] = useState("");

  const [participants, setParticipants] = useState<Participant[]>([
    nouveauParticipant(),
  ]);

  const [placesMiseEauOccupees, setPlacesMiseEauOccupees] = useState(0);
  const [placesObservateurOccupees, setPlacesObservateurOccupees] = useState(0);

  const [chargement, setChargement] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const demandes = useMemo(() => {
    return participants.reduce(
      (acc, p) => {
        if (p.role === "mise_eau") acc.miseEau += 1;
        if (p.role === "observateur") acc.observateurs += 1;
        return acc;
      },
      { miseEau: 0, observateurs: 0 }
    );
  }, [participants]);

  const placesRestantesMiseEau = MAX_MISE_EAU - placesMiseEauOccupees;
  const placesRestantesObservateur =
    MAX_OBSERVATEURS - placesObservateurOccupees;

  const total = useMemo(() => {
    return participants.reduce((somme, p) => somme + prixParticipant(p), 0);
  }, [participants]);

  useEffect(() => {
    async function chargerPlaces() {
      if (!date || !depart) return;

      setChargement(true);
      setErreur("");

      const { data, error } = await supabase
        .from("reservations_baleines")
        .select("participants, statut_paiement")
        .eq("date_sortie", date)
        .eq("depart", depart)
        .in("statut_paiement", ["pending", "paid", "paye"]);

      if (error) {
        setErreur("Impossible de charger les places disponibles.");
        setChargement(false);
        return;
      }

      let miseEau = 0;
      let observateurs = 0;

      for (const reservation of data || []) {
        const liste = Array.isArray(reservation.participants)
          ? reservation.participants
          : [];

        for (const participant of liste) {
          if (participant.role === "mise_eau") miseEau++;
          if (participant.role === "observateur") observateurs++;
        }
      }

      setPlacesMiseEauOccupees(miseEau);
      setPlacesObservateurOccupees(observateurs);
      setChargement(false);
    }

    chargerPlaces();
  }, [date, depart]);

  function modifierParticipant(
    index: number,
    champ: keyof Participant,
    valeur: string | boolean
  ) {
    setParticipants((anciens) =>
      anciens.map((p, i) => {
        if (i !== index) return p;

        const modifie = {
          ...p,
          [champ]: valeur,
        };

        if (champ === "role" && valeur === "observateur") {
          modifie.materielPerso = false;
          modifie.tailleCombinaison = "";
          modifie.pointurePalmes = "";
        }

        if (champ === "materielPerso" && valeur === true) {
          modifie.tailleCombinaison = "";
          modifie.pointurePalmes = "";
        }

        return modifie;
      })
    );
  }

  function ajouterParticipant() {
    setParticipants((anciens) => [...anciens, nouveauParticipant()]);
  }

  function supprimerParticipant(index: number) {
    if (participants.length === 1) return;
    setParticipants((anciens) => anciens.filter((_, i) => i !== index));
  }

  function verifierFormulaire() {
    if (!date) return "Choisis une date.";
    if (date < SAISON_DEBUT || date > SAISON_FIN) {
      return "Les sorties baleines sont possibles du 20 juillet au 20 novembre 2026.";
    }

    if (!responsablePrenom.trim()) return "Indique le prénom du responsable.";
    if (!responsableNom.trim()) return "Indique le nom du responsable.";
    if (!responsableEmail.trim()) return "Indique l’email du responsable.";
    if (!responsableTelephone.trim()) return "Indique le téléphone du responsable.";

    if (demandes.miseEau > placesRestantesMiseEau) {
      return "Il n’y a pas assez de places disponibles pour les mises à l’eau.";
    }

    if (demandes.observateurs > placesRestantesObservateur) {
      return "Il n’y a pas assez de places disponibles pour les observateurs.";
    }

    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      const label = `Participant ${i + 1}`;

      if (!p.prenom.trim()) return `${label} : prénom obligatoire.`;
      if (!p.nom.trim()) return `${label} : nom obligatoire.`;
      if (!p.age.trim()) return `${label} : âge obligatoire.`;

      const age = Number(p.age);
      if (!Number.isFinite(age) || age <= 0 || age > 100) {
        return `${label} : âge invalide.`;
      }

      if (p.role === "mise_eau" && !p.materielPerso) {
        if (!p.tailleCombinaison) {
          return `${label} : choisis une taille de combinaison.`;
        }

        if (!p.pointurePalmes) {
          return `${label} : choisis une pointure de palmes.`;
        }
      }
    }

    return "";
  }

  async function reserver() {
    setErreur("");
    setMessage("");

    const probleme = verifierFormulaire();

    if (probleme) {
      setErreur(probleme);
      return;
    }

    setEnvoi(true);

    const reservation = {
      date_sortie: date,
      depart,
      responsable_prenom: responsablePrenom.trim(),
      responsable_nom: responsableNom.trim(),
      responsable_email: responsableEmail.trim(),
      responsable_telephone: responsableTelephone.trim(),
      participants,
      nombre_mise_eau: demandes.miseEau,
      nombre_observateurs: demandes.observateurs,
      montant_total: total,
      devise: "XPF",
      statut_paiement: "pending",
      paye: false,
      source_paiement: "payzen_baleines",
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("reservations_baleines")
      .insert(reservation)
      .select("id")
      .single();

    if (error || !data?.id) {
      setErreur(error?.message || "Impossible d’enregistrer la réservation.");
      setEnvoi(false);
      return;
    }

    setMessage("Réservation enregistrée. Redirection vers PayZen...");
    window.location.href = `/api/payzen/baleines?reservationId=${data.id}`;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white text-slate-900">
      <section className="bg-blue-950 px-4 py-14 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold uppercase tracking-widest text-sky-300">
            Tahiti Trip Booking
          </p>
          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Réservation sortie baleines
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-blue-100">
            Sorties du 20 juillet au 20 novembre 2026. Deux départs par jour :
            7h00 et 13h15.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="rounded-3xl bg-white p-6 shadow">
            <h2 className="text-2xl font-bold">1. Date et départ</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label>
                <span className="text-sm font-semibold">Date</span>
                <input
                  type="date"
                  min={SAISON_DEBUT}
                  max={SAISON_FIN}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                />
              </label>

              <label>
                <span className="text-sm font-semibold">Départ</span>
                <select
                  value={depart}
                  onChange={(e) => setDepart(e.target.value as Depart)}
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                >
                  <option value="07:00">7h00</option>
                  <option value="13:15">13h15</option>
                </select>
              </label>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-sky-50 p-4">
                <p className="text-sm text-slate-600">Mises à l’eau restantes</p>
                <p className="text-3xl font-black text-blue-800">
                  {chargement ? "..." : Math.max(0, placesRestantesMiseEau)}
                  <span className="text-base font-bold"> / {MAX_MISE_EAU}</span>
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-sm text-slate-600">Observateurs restants</p>
                <p className="text-3xl font-black text-emerald-800">
                  {chargement ? "..." : Math.max(0, placesRestantesObservateur)}
                  <span className="text-base font-bold">
                    {" "}
                    / {MAX_OBSERVATEURS}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="hidden rounded-3xl bg-white p-6 shadow">
            <h2 className="text-2xl font-bold">2. Responsable</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input
                placeholder="Prénom"
                value={responsablePrenom}
                onChange={(e) => setResponsablePrenom(e.target.value)}
                className="rounded-xl border px-4 py-3"
              />
              <input
                placeholder="Nom"
                value={responsableNom}
                onChange={(e) => setResponsableNom(e.target.value)}
                className="rounded-xl border px-4 py-3"
              />
              <input
                type="email"
                placeholder="Email"
                value={responsableEmail}
                onChange={(e) => setResponsableEmail(e.target.value)}
                className="rounded-xl border px-4 py-3"
              />
              <input
                type="tel"
                placeholder="Téléphone"
                value={responsableTelephone}
                onChange={(e) => setResponsableTelephone(e.target.value)}
                className="rounded-xl border px-4 py-3"
              />
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">2. Participants</h2>

              <button
                type="button"
                onClick={ajouterParticipant}
                className="rounded-full bg-blue-700 px-5 py-2 font-bold text-white"
              >
                + Ajouter
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {participants.map((p, index) => (
                <div key={index} className="rounded-2xl border p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-black">
                      Participant {index + 1}
                      {index === 0 ? " (Responsable)" : ""}
                    </h3>

                    {participants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => supprimerParticipant(index)}
                        className="font-bold text-red-600"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      placeholder="Prénom"
                      value={p.prenom}
                      onChange={(e) => {
                        modifierParticipant(index, "prenom", e.target.value);
                        if (index === 0) {
                          setResponsablePrenom(e.target.value);
                        }
                      }}
                      className="rounded-xl border px-4 py-3"
                    />

                    <input
                      placeholder="Nom"
                      value={p.nom}
                      onChange={(e) => {
                        modifierParticipant(index, "nom", e.target.value);
                        if (index === 0) {
                          setResponsableNom(e.target.value);
                        }
                      }}
                      className="rounded-xl border px-4 py-3"
                    />

                    {index === 0 && (
                      <>
                        <input
                          type="email"
                          placeholder="Email"
                          value={responsableEmail}
                          onChange={(e) =>
                            setResponsableEmail(e.target.value)
                          }
                          className="rounded-xl border px-4 py-3"
                        />

                        <input
                          type="tel"
                          placeholder="TÃ©lÃ©phone"
                          value={responsableTelephone}
                          onChange={(e) =>
                            setResponsableTelephone(e.target.value)
                          }
                          className="rounded-xl border px-4 py-3"
                        />
                      </>
                    )}

                    <input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="Âge"
                      value={p.age}
                      onChange={(e) =>
                        modifierParticipant(index, "age", e.target.value)
                      }
                      className="rounded-xl border px-4 py-3"
                    />

                    <select
                      value={p.role}
                      onChange={(e) =>
                        modifierParticipant(
                          index,
                          "role",
                          e.target.value as Role
                        )
                      }
                      className="rounded-xl border px-4 py-3"
                    >
                      <option value="mise_eau">Mise à l’eau</option>
                      <option value="observateur">Observateur</option>
                    </select>
                  </div>

                  {p.role === "mise_eau" && (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <label className="flex items-center gap-3 font-semibold">
                        <input
                          type="checkbox"
                          checked={p.materielPerso}
                          onChange={(e) =>
                            modifierParticipant(
                              index,
                              "materielPerso",
                              e.target.checked
                            )
                          }
                        />
                        Le participant possède son propre matériel
                      </label>

                      {!p.materielPerso && (
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <select
                            value={p.tailleCombinaison}
                            onChange={(e) =>
                              modifierParticipant(
                                index,
                                "tailleCombinaison",
                                e.target.value
                              )
                            }
                            className="rounded-xl border px-4 py-3"
                          >
                            <option value="">Taille combinaison</option>
                            {TAILLES_COMBI.map((taille) => (
                              <option key={taille} value={taille}>
                                {taille}
                              </option>
                            ))}
                          </select>

                          <select
                            value={p.pointurePalmes}
                            onChange={(e) =>
                              modifierParticipant(
                                index,
                                "pointurePalmes",
                                e.target.value
                              )
                            }
                            className="rounded-xl border px-4 py-3"
                          >
                            <option value="">Pointure palmes</option>
                            {POINTURES_PALMES.map((pointure) => (
                              <option key={pointure} value={pointure}>
                                {pointure}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {p.role === "observateur" && (
                    <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                      Observateur : pas de combinaison ni de palmes à renseigner.
                    </p>
                  )}

                  <p className="mt-4 text-right text-lg font-black">
                    {formatPrix(prixParticipant(p))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside>
          <div className="sticky top-6 rounded-3xl bg-white p-6 shadow">
            <h2 className="text-2xl font-black">Récapitulatif</h2>

            <div className="mt-5 space-y-3 text-sm">
              <p>Date : <strong>{date || "Non choisie"}</strong></p>
              <p>Départ : <strong>{depart}</strong></p>
              <p>Mises à l’eau : <strong>{demandes.miseEau}</strong></p>
              <p>Observateurs : <strong>{demandes.observateurs}</strong></p>
            </div>

            <div className="my-5 border-t" />

            <div className="space-y-2 text-sm">
              <p>Mise à l’eau : {formatPrix(TARIF_MISE_EAU)}</p>
              <p>Observateur adulte : {formatPrix(TARIF_OBSERVATEUR)}</p>
              <p>Enfant observateur : {formatPrix(TARIF_ENFANT_OBSERVATEUR)}</p>
            </div>

            <div className="my-5 border-t" />

            <p className="text-3xl font-black text-blue-800">
              {formatPrix(total)}
            </p>

            {erreur && (
              <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
                {erreur}
              </p>
            )}

            {message && (
              <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={reserver}
              disabled={envoi}
              className="mt-6 w-full rounded-2xl bg-blue-700 px-5 py-4 text-lg font-black text-white disabled:bg-slate-400"
            >
              {envoi ? "Redirection..." : "Réserver et payer"}
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
