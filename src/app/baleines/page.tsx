"use client";

import Image from "next/image";
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
  "34",
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
  "49",
];

function nouveauParticipant(role: Role = "mise_eau"): Participant {
  return {
    prenom: "",
    nom: "",
    age: "",
    role,
    materielPerso: false,
    tailleCombinaison: "",
    pointurePalmes: "",
  };
}

function prixParticipant(participant: Participant) {
  const age = Number(participant.age);

  if (participant.role === "mise_eau") return TARIF_MISE_EAU;
  if (age > 0 && age < 12) return TARIF_ENFANT_OBSERVATEUR;

  return TARIF_OBSERVATEUR;
}

function formatPrix(montant: number) {
  return `${montant.toLocaleString("fr-FR")} FCP`;
}

export default function BaleinesPage() {
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
      (acc, participant) => {
        if (participant.role === "mise_eau") acc.miseEau += 1;
        if (participant.role === "observateur") acc.observateurs += 1;
        return acc;
      },
      { miseEau: 0, observateurs: 0 }
    );
  }, [participants]);

  const placesRestantesMiseEau = MAX_MISE_EAU - placesMiseEauOccupees;
  const placesRestantesObservateur =
    MAX_OBSERVATEURS - placesObservateurOccupees;
  const peutAjouterMiseEau =
    demandes.miseEau < Math.max(0, placesRestantesMiseEau);
  const peutAjouterObservateur =
    demandes.observateurs < Math.max(0, placesRestantesObservateur);
  const peutAjouterParticipant = peutAjouterMiseEau || peutAjouterObservateur;

  const total = useMemo(() => {
    return participants.reduce(
      (somme, participant) => somme + prixParticipant(participant),
      0
    );
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
      anciens.map((participant, participantIndex) => {
        if (participantIndex !== index) return participant;

        if (champ === "role") {
          const prochainRole = valeur as Role;

          if (
            prochainRole === "mise_eau" &&
            participant.role !== "mise_eau" &&
            !peutAjouterMiseEau
          ) {
            return participant;
          }

          if (
            prochainRole === "observateur" &&
            participant.role !== "observateur" &&
            !peutAjouterObservateur
          ) {
            return participant;
          }
        }

        const modifie = {
          ...participant,
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
    if (!peutAjouterParticipant) return;

    const role: Role = peutAjouterMiseEau ? "mise_eau" : "observateur";
    setParticipants((anciens) => [...anciens, nouveauParticipant(role)]);
  }

  function supprimerParticipant(index: number) {
    if (participants.length === 1) return;
    setParticipants((anciens) =>
      anciens.filter((_, participantIndex) => participantIndex !== index)
    );
  }

  function verifierFormulaire() {
    if (!date) return "Choisis une date.";
    if (date < SAISON_DEBUT || date > SAISON_FIN) {
      return "Les sorties baleines sont possibles du 20 juillet au 20 novembre 2026.";
    }

    if (!responsablePrenom.trim()) return "Indique le prenom du responsable.";
    if (!responsableNom.trim()) return "Indique le nom du responsable.";
    if (!responsableEmail.trim()) return "Indique l'email du responsable.";
    if (!responsableTelephone.trim()) {
      return "Indique le telephone du responsable.";
    }

    if (demandes.miseEau > placesRestantesMiseEau) {
      return "Il n'y a pas assez de places disponibles pour les mises a l'eau.";
    }

    if (demandes.observateurs > placesRestantesObservateur) {
      return "Il n'y a pas assez de places disponibles pour les observateurs.";
    }

    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      const label = `Participant ${i + 1}`;

      if (!participant.prenom.trim()) return `${label} : prenom obligatoire.`;
      if (!participant.nom.trim()) return `${label} : nom obligatoire.`;
      if (!participant.age.trim()) return `${label} : age obligatoire.`;

      const age = Number(participant.age);
      if (!Number.isFinite(age) || age <= 0 || age > 100) {
        return `${label} : age invalide.`;
      }

      if (participant.role === "mise_eau" && !participant.materielPerso) {
        if (!participant.tailleCombinaison) {
          return `${label} : choisis une taille de combinaison.`;
        }

        if (!participant.pointurePalmes) {
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
      setErreur(error?.message || "Impossible d'enregistrer la reservation.");
      setEnvoi(false);
      return;
    }

    setMessage("Reservation enregistree. Redirection vers PayZen...");
    window.location.href = `/api/payzen/baleines?reservationId=${data.id}`;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white text-slate-900">
      <section className="px-4 pt-5">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[32px] border border-cyan-100 bg-white shadow-[0_22px_70px_rgba(14,116,144,0.14)]">
          <div className="relative h-[170px] overflow-hidden bg-cyan-50 md:h-[280px]">
            <Image
              src="/images/baleines/hero.jpg"
              alt="Observation des baleines a Tahiti"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 1152px"
              className="object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/90" />
          </div>

          <div className="p-5 md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
              Tahiti Trip Fishing
            </p>

            <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950 md:text-5xl">
              Observation des baleines a Tahiti
            </h1>

            <p className="mt-3 max-w-2xl text-base font-semibold leading-relaxed text-slate-600 md:text-lg">
              Sortie en petit comite, sans rotation des nageurs.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
                <p className="text-2xl font-black text-slate-950">6</p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-cyan-800">
                  Nageurs max
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-2xl font-black text-slate-950">2</p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-800">
                  Observateurs max
                </p>
              </div>

              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <p className="text-lg font-black text-slate-950">2 departs</p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-sky-800">
                  7h00 et 13h15
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="rounded-3xl bg-white p-6 shadow">
            <h2 className="text-2xl font-bold">1. Date et depart</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label>
                <span className="text-sm font-semibold">Date</span>
                <input
                  type="date"
                  min={SAISON_DEBUT}
                  max={SAISON_FIN}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="mt-2 min-h-14 w-full touch-manipulation appearance-none rounded-xl border px-4 py-3 text-base font-semibold"
                />
              </label>

              <label>
                <span className="text-sm font-semibold">Depart</span>
                <select
                  value={depart}
                  onChange={(event) => setDepart(event.target.value as Depart)}
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                >
                  <option value="07:00">7h00</option>
                  <option value="13:15">13h15</option>
                </select>
              </label>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-sky-50 p-4">
                <p className="text-sm text-slate-600">
                  Nageurs restants
                </p>
                <p className="text-3xl font-black text-blue-800">
                  {chargement ? "..." : Math.max(0, placesRestantesMiseEau)}
                  <span className="text-base font-bold"> / {MAX_MISE_EAU}</span>
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-sm text-slate-600">
                  Observateurs restants
                </p>
                <p className="text-3xl font-black text-emerald-800">
                  {chargement
                    ? "..."
                    : Math.max(0, placesRestantesObservateur)}
                  <span className="text-base font-bold">
                    {" "}
                    / {MAX_OBSERVATEURS}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">2. Participants</h2>

              <button
                type="button"
                onClick={ajouterParticipant}
                disabled={!peutAjouterParticipant}
                className="rounded-full bg-blue-700 px-5 py-2 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                + Ajouter
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {participants.map((participant, index) => (
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
                      placeholder="Prenom"
                      value={participant.prenom}
                      onChange={(event) => {
                        modifierParticipant(index, "prenom", event.target.value);
                        if (index === 0) {
                          setResponsablePrenom(event.target.value);
                        }
                      }}
                      className="rounded-xl border px-4 py-3"
                    />

                    <input
                      placeholder="Nom"
                      value={participant.nom}
                      onChange={(event) => {
                        modifierParticipant(index, "nom", event.target.value);
                        if (index === 0) {
                          setResponsableNom(event.target.value);
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
                          onChange={(event) =>
                            setResponsableEmail(event.target.value)
                          }
                          className="rounded-xl border px-4 py-3"
                        />

                        <input
                          type="tel"
                          placeholder="Telephone"
                          value={responsableTelephone}
                          onChange={(event) =>
                            setResponsableTelephone(event.target.value)
                          }
                          className="rounded-xl border px-4 py-3"
                        />
                      </>
                    )}

                    <input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="Age"
                      value={participant.age}
                      onChange={(event) =>
                        modifierParticipant(index, "age", event.target.value)
                      }
                      className="rounded-xl border px-4 py-3"
                    />

                    <select
                      value={participant.role}
                      onChange={(event) =>
                        modifierParticipant(
                          index,
                          "role",
                          event.target.value as Role
                        )
                      }
                      className="rounded-xl border px-4 py-3"
                    >
                      <option
                        value="mise_eau"
                        disabled={
                          participant.role !== "mise_eau" && !peutAjouterMiseEau
                        }
                      >
                        Nageur
                      </option>
                      <option
                        value="observateur"
                        disabled={
                          participant.role !== "observateur" &&
                          !peutAjouterObservateur
                        }
                      >
                        Observateur
                      </option>
                    </select>
                  </div>

                  {participant.role === "mise_eau" && (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <label className="flex items-center gap-3 font-semibold">
                        <input
                          type="checkbox"
                          checked={participant.materielPerso}
                          onChange={(event) =>
                            modifierParticipant(
                              index,
                              "materielPerso",
                              event.target.checked
                            )
                          }
                        />
                        Le participant possede son propre materiel
                      </label>

                      {!participant.materielPerso && (
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <select
                            value={participant.tailleCombinaison}
                            onChange={(event) =>
                              modifierParticipant(
                                index,
                                "tailleCombinaison",
                                event.target.value
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
                            value={participant.pointurePalmes}
                            onChange={(event) =>
                              modifierParticipant(
                                index,
                                "pointurePalmes",
                                event.target.value
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

                  {participant.role === "observateur" && (
                    <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                      Observateur : pas de combinaison ni de palmes a renseigner.
                    </p>
                  )}

                  <p className="mt-4 text-right text-lg font-black">
                    {formatPrix(prixParticipant(participant))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside>
          <div className="sticky top-6 rounded-3xl bg-white p-6 shadow">
            <h2 className="text-2xl font-black">Recapitulatif</h2>

            <div className="mt-5 space-y-3 text-sm">
              <p>
                Date : <strong>{date || "Non choisie"}</strong>
              </p>
              <p>
                Depart : <strong>{depart}</strong>
              </p>
              <p>
                Nageurs : <strong>{demandes.miseEau}</strong>
              </p>
              <p>
                Observateurs : <strong>{demandes.observateurs}</strong>
              </p>
            </div>

            <div className="my-5 border-t" />

            <div className="space-y-2 text-sm">
              <p>Nageur : {formatPrix(TARIF_MISE_EAU)}</p>
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
              {envoi ? "Redirection..." : "Reserver et payer"}
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
