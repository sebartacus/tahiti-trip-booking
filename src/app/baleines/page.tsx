"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BaleinesHero } from "./components/BaleinesHero";
import { BaleinesGallery } from "./components/BaleinesGallery";
import { BaleinesInfoCards } from "./components/BaleinesInfoCards";
import { BaleinesIntro } from "./components/BaleinesIntro";
import { BaleinesVideo } from "./components/BaleinesVideo";
import { DateStep } from "./components/DateStep";
import { DepartureStep } from "./components/DepartureStep";
import { ParticipantsStep } from "./components/ParticipantsStep";
import { SummaryStep } from "./components/SummaryStep";
import {
  MAX_MISE_EAU,
  MAX_OBSERVATEURS,
  SAISON_DEBUT,
  SAISON_FIN,
  compterDemandes,
  ageRenseigneMineur,
  formatPrix,
  nouveauParticipant,
  prixParticipant,
  nettoyerParticipant,
} from "./lib/rules";
import type { Depart, Participant, Role } from "./lib/types";

type BoatSlotStatus = "available" | "hold" | "reserved" | "blocked";
type BoatSlotName = "morning" | "afternoon";
type BoatCalendarSlot = {
  date: string;
  slot: BoatSlotName;
  status: BoatSlotStatus;
  activity: "baleines" | "peche" | "peche_nuit" | null;
};
type DepartCapacities = Record<
  Depart,
  {
    miseEau: number;
    observateurs: number;
  }
>;

const departSlots: Record<Depart, BoatSlotName> = {
  "07:00": "morning",
  "13:15": "afternoon",
};
const emptyCapacities: DepartCapacities = {
  "07:00": { miseEau: 0, observateurs: 0 },
  "13:15": { miseEau: 0, observateurs: 0 },
};

function compterParticipantsReservation(participants: unknown) {
  const compteur = { miseEau: 0, observateurs: 0 };

  if (!Array.isArray(participants)) return compteur;

  for (const participant of participants) {
    if (
      typeof participant === "object" &&
      participant !== null &&
      "role" in participant
    ) {
      if (participant.role === "mise_eau") compteur.miseEau++;
      if (participant.role === "observateur") compteur.observateurs++;
    }
  }

  return compteur;
}

function bateauDisponiblePourBaleines(slot: BoatCalendarSlot | undefined) {
  if (!slot || slot.status === "available") return true;
  if (slot.status === "blocked") return false;
  return slot.activity === "baleines";
}

export default function BaleinesPage() {
  const [date, setDate] = useState("");
  const dateRef = useRef("");
  const [depart, setDepart] = useState<Depart>("07:00");
  const [responsableEmail, setResponsableEmail] = useState("");
  const [responsableTelephone, setResponsableTelephone] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([
    nouveauParticipant(),
  ]);
  const [capacitesDepart, setCapacitesDepart] =
    useState<DepartCapacities>(emptyCapacities);
  const [boatSlots, setBoatSlots] = useState<
    Partial<Record<BoatSlotName, BoatCalendarSlot>>
  >({});
  const [chargement, setChargement] = useState(false);
  const [chargementBateau, setChargementBateau] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const demandes = useMemo(() => compterDemandes(participants), [participants]);
  const placesRestantesMiseEau =
    MAX_MISE_EAU - capacitesDepart[depart].miseEau;
  const placesRestantesObservateur =
    MAX_OBSERVATEURS - capacitesDepart[depart].observateurs;
  const peutAjouterMiseEau =
    demandes.miseEau < Math.max(0, placesRestantesMiseEau);
  const peutAjouterObservateur =
    demandes.observateurs < Math.max(0, placesRestantesObservateur);
  const peutAjouterParticipant = peutAjouterMiseEau || peutAjouterObservateur;
  const departAvailability = useMemo(() => {
    const morningHasSpace =
      capacitesDepart["07:00"].miseEau < MAX_MISE_EAU ||
      capacitesDepart["07:00"].observateurs < MAX_OBSERVATEURS;
    const afternoonHasSpace =
      capacitesDepart["13:15"].miseEau < MAX_MISE_EAU ||
      capacitesDepart["13:15"].observateurs < MAX_OBSERVATEURS;

    return {
      "07:00":
        bateauDisponiblePourBaleines(boatSlots.morning) &&
        morningHasSpace,
      "13:15":
        bateauDisponiblePourBaleines(boatSlots.afternoon) &&
        afternoonHasSpace,
    };
  }, [boatSlots, capacitesDepart]);
  const total = useMemo(() => {
    return participants.reduce(
      (somme, participant) => somme + prixParticipant(participant),
      0
    );
  }, [participants]);

  useEffect(() => {
    dateRef.current = date;
  }, [date]);

  useEffect(() => {
    async function chargerCalendrierBateau() {
      if (!date) {
        setBoatSlots({});
        return;
      }

      setChargementBateau(true);
      setErreur("");

      try {
        const response = await fetch(
          `/api/bateau/calendar?from=${date}&to=${date}`
        );
        const payload = await response.json();

        if (!response.ok) {
          setErreur(
            payload.error || "Impossible de charger le calendrier bateau."
          );
          setBoatSlots({});
          return;
        }

        const prochainsSlots: Partial<Record<BoatSlotName, BoatCalendarSlot>> =
          {};

        const apiSlots = Array.isArray(payload.slots)
          ? (payload.slots as BoatCalendarSlot[])
          : [];

        for (const slot of apiSlots) {
          if (slot.slot === "morning" || slot.slot === "afternoon") {
            prochainsSlots[slot.slot] = slot;
          }
        }

        setBoatSlots(prochainsSlots);
      } catch {
        setErreur("Impossible de charger le calendrier bateau.");
        setBoatSlots({});
      } finally {
        setChargementBateau(false);
      }
    }

    chargerCalendrierBateau();
  }, [date]);

  async function chargerCapacitesBaleines(selectedDate: string) {
    const { data, error } = await supabase
      .from("reservations_baleines")
      .select("depart, participants, statut_paiement")
      .eq("date_sortie", selectedDate)
      .in("statut_paiement", ["pending", "paid", "paye"]);

    if (error) throw error;

    const prochainesCapacites: DepartCapacities = {
      "07:00": { miseEau: 0, observateurs: 0 },
      "13:15": { miseEau: 0, observateurs: 0 },
    };

    for (const reservation of data || []) {
      if (reservation.depart !== "07:00" && reservation.depart !== "13:15") {
        continue;
      }

      const reservationDepart = reservation.depart as Depart;
      const compteur = compterParticipantsReservation(reservation.participants);
      prochainesCapacites[reservationDepart].miseEau += compteur.miseEau;
      prochainesCapacites[reservationDepart].observateurs +=
        compteur.observateurs;
    }

    return prochainesCapacites;
  }

  useEffect(() => {
    async function chargerPlaces() {
      if (!date) {
        setCapacitesDepart(emptyCapacities);
        return;
      }

      setChargement(true);
      setErreur("");

      try {
        const prochainesCapacites = await chargerCapacitesBaleines(date);
        setCapacitesDepart(prochainesCapacites);
      } catch {
        setErreur("Impossible de charger les places disponibles.");
        setCapacitesDepart(emptyCapacities);
      } finally {
        setChargement(false);
      }
    }

    chargerPlaces();
  }, [date]);

  function getSelectedDate() {
    return dateRef.current || date;
  }

  function handleDateChange(value: string) {
    dateRef.current = value;
    setDate(value);
  }

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
            ageRenseigneMineur(participant.age)
          ) {
            return nettoyerParticipant({
              ...participant,
              role: "observateur",
            });
          }

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

        if (
          champ === "age" &&
          typeof valeur === "string" &&
          ageRenseigneMineur(valeur)
        ) {
          return nettoyerParticipant({
            ...participant,
            age: valeur,
            role: "observateur",
          });
        }

        return nettoyerParticipant({
          ...participant,
          [champ]: valeur,
        });
      })
    );
  }

  function handleAddParticipant() {
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

  function verifierDate() {
    const selectedDate = getSelectedDate();

    if (!selectedDate) return "Choisissez une date.";
    if (selectedDate < SAISON_DEBUT || selectedDate > SAISON_FIN) {
      return "Les sorties baleines sont possibles du 20 juillet au 20 novembre 2026.";
    }

    if (!departAvailability["07:00"] && !departAvailability["13:15"]) {
      return "Aucun départ bateau n'est disponible sur cette date.";
    }

    if (!departAvailability[depart]) {
      return "Ce départ bateau est indisponible. Choisis un autre départ.";
    }

    return "";
  }

  function verifierParticipants() {
    const responsable = participants[0];

    if (!responsable?.prenom.trim()) return "Indique le prénom du responsable.";
    if (!responsable.nom.trim()) return "Indique le nom du responsable.";
    if (!responsableEmail.trim()) return "Indique l'email du responsable.";
    if (!responsableTelephone.trim()) {
      return "Indique le téléphone du responsable.";
    }

    if (demandes.miseEau > placesRestantesMiseEau) {
      return "Il n'y a pas assez de places disponibles pour les mises à l'eau.";
    }

    if (demandes.observateurs > placesRestantesObservateur) {
      return "Il n'y a pas assez de places disponibles pour les observateurs.";
    }

    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      const label = `Participant ${i + 1}`;

      if (!participant.prenom.trim()) return `${label} : prénom obligatoire.`;
      if (!participant.nom.trim()) return `${label} : nom obligatoire.`;
      if (!participant.age.trim()) return `${label} : âge obligatoire.`;

      const age = Number(participant.age);
      if (!Number.isFinite(age) || age <= 0 || age > 100) {
        return `${label} : âge invalide.`;
      }

      if (participant.role === "mise_eau" && age < 12) {
        return "La mise à l'eau est réservée aux participants de 12 ans et plus.";
      }

      if (participant.role === "mise_eau") {
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

  function verifierFormulaire() {
    return verifierDate() || verifierParticipants();
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

    const responsable = participants[0];
    const selectedDate = getSelectedDate();

    try {
      const dernieresCapacites = await chargerCapacitesBaleines(selectedDate);
      setCapacitesDepart(dernieresCapacites);

      const capaciteDepart = dernieresCapacites[depart];

      if (
        demandes.miseEau > MAX_MISE_EAU - capaciteDepart.miseEau ||
        demandes.observateurs >
          MAX_OBSERVATEURS - capaciteDepart.observateurs
      ) {
        setErreur("Ce départ est désormais complet.");
        setEnvoi(false);
        return;
      }
    } catch {
      setErreur("Impossible de vérifier les places disponibles.");
      setEnvoi(false);
      return;
    }

    const reservation = {
      date_sortie: selectedDate,
      depart,
      responsable_prenom: responsable.prenom.trim(),
      responsable_nom: responsable.nom.trim(),
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
      setErreur(error?.message || "Impossible d'enregistrer la réservation.");
      setEnvoi(false);
      return;
    }

    const selectedBoatSlot = boatSlots[departSlots[depart]];

    if (!selectedBoatSlot || selectedBoatSlot.status === "available") {
      const reponseHold = await fetch("/api/bateau/hold", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activity: "baleines",
          reservationTable: "reservations_baleines",
          reservationId: data.id,
          date: selectedDate,
          slots: [departSlots[depart]],
        }),
      });

      const hold = await reponseHold.json();

      if (!reponseHold.ok) {
        console.error(hold);
        setErreur(
          reponseHold.status === 409
            ? "Ce créneau vient d'être réservé. Choisissez un autre départ."
            : "Impossible de bloquer le créneau bateau."
        );
        setEnvoi(false);
        return;
      }
    } else if (!bateauDisponiblePourBaleines(selectedBoatSlot)) {
      setErreur("Ce créneau vient d'être réservé. Choisissez un autre départ.");
      setEnvoi(false);
      return;
    }

    const reponsePayzen = await fetch("/api/payzen", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        montant: total,
        email: responsableEmail.trim(),
        reservationId: data.id,
        reservationTable: "reservations_baleines",
        activity: "baleines",
        returnUrl: "/baleines/success",
      }),
    });

    const paiement = await reponsePayzen.json();

    if (!reponsePayzen.ok) {
      console.error(paiement);
      setErreur("Erreur lors de la préparation du paiement.");
      setEnvoi(false);
      return;
    }

    setMessage("Réservation enregistrée. Redirection vers PayZen...");

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
    <main className="min-h-screen bg-white text-slate-950">
      <BaleinesHero />

      <div className="mx-auto max-w-md space-y-8 px-4 py-8 md:max-w-5xl md:py-10">
        <BaleinesIntro />
        <BaleinesVideo />

        <section className="peche-reveal rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.10)] transition duration-300 hover:shadow-[0_22px_50px_rgba(8,145,178,0.13)] md:p-7">
          <DateStep
            date={date}
            chargement={chargement || chargementBateau}
            placesRestantesMiseEau={placesRestantesMiseEau}
            placesRestantesObservateur={placesRestantesObservateur}
            onDateChange={handleDateChange}
          />
        </section>

        <section className="peche-reveal rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.10)] transition duration-300 hover:shadow-[0_22px_50px_rgba(8,145,178,0.13)] md:p-7">
          <DepartureStep
            depart={depart}
            availability={departAvailability}
            capacities={capacitesDepart}
            onDepartChange={setDepart}
          />
        </section>

        <section className="peche-reveal rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.10)] transition duration-300 hover:shadow-[0_22px_50px_rgba(8,145,178,0.13)] md:p-7">
          <ParticipantsStep
            participants={participants}
            demandes={demandes}
            placesRestantesMiseEau={placesRestantesMiseEau}
            placesRestantesObservateur={placesRestantesObservateur}
            peutAjouterParticipant={peutAjouterParticipant}
            peutAjouterMiseEau={peutAjouterMiseEau}
            peutAjouterObservateur={peutAjouterObservateur}
            responsableEmail={responsableEmail}
            responsableTelephone={responsableTelephone}
            onAddParticipant={handleAddParticipant}
            onParticipantChange={modifierParticipant}
            onEmailChange={setResponsableEmail}
            onTelephoneChange={setResponsableTelephone}
            onRemoveParticipant={supprimerParticipant}
          />
        </section>

        <section className="peche-reveal rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.10)] transition duration-300 hover:shadow-[0_22px_50px_rgba(8,145,178,0.13)] md:p-7">
          <SummaryStep
            date={date}
            depart={depart}
            participants={participants}
            total={total}
            envoi={envoi}
            erreur={erreur}
            message={message}
            onPay={reserver}
          />
        </section>

        <BaleinesGallery />
        <BaleinesInfoCards />

        {erreur && (
          <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
            {erreur}
          </p>
        )}

        <p className="pb-6 text-center text-sm font-black text-cyan-800">
          Total : {formatPrix(total)}
        </p>
      </div>
    </main>
  );
}
