"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BaleinesHero } from "./components/BaleinesHero";
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
};

const departSlots: Record<Depart, BoatSlotName> = {
  "07:00": "morning",
  "13:15": "afternoon",
};

export default function BaleinesPage() {
  const [date, setDate] = useState("");
  const dateRef = useRef("");
  const [depart, setDepart] = useState<Depart>("07:00");
  const [responsableEmail, setResponsableEmail] = useState("");
  const [responsableTelephone, setResponsableTelephone] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([
    nouveauParticipant(),
  ]);
  const [placesMiseEauOccupees, setPlacesMiseEauOccupees] = useState(0);
  const [placesObservateurOccupees, setPlacesObservateurOccupees] = useState(0);
  const [boatSlots, setBoatSlots] = useState<
    Partial<Record<BoatSlotName, BoatCalendarSlot>>
  >({});
  const [chargement, setChargement] = useState(false);
  const [chargementBateau, setChargementBateau] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const demandes = useMemo(() => compterDemandes(participants), [participants]);
  const placesRestantesMiseEau = MAX_MISE_EAU - placesMiseEauOccupees;
  const placesRestantesObservateur =
    MAX_OBSERVATEURS - placesObservateurOccupees;
  const peutAjouterMiseEau =
    demandes.miseEau < Math.max(0, placesRestantesMiseEau);
  const peutAjouterObservateur =
    demandes.observateurs < Math.max(0, placesRestantesObservateur);
  const peutAjouterParticipant = peutAjouterMiseEau || peutAjouterObservateur;
  const departAvailability = useMemo(() => {
    return {
      "07:00": !boatSlots.morning || boatSlots.morning.status === "available",
      "13:15":
        !boatSlots.afternoon || boatSlots.afternoon.status === "available",
    };
  }, [boatSlots]);
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

    if (!selectedDate) return "Choisis une date.";
    if (selectedDate < SAISON_DEBUT || selectedDate > SAISON_FIN) {
      return "Les sorties baleines sont possibles du 20 juillet au 20 novembre 2026.";
    }

    if (!departAvailability["07:00"] && !departAvailability["13:15"]) {
      return "Aucun depart bateau n'est disponible sur cette date.";
    }

    if (!departAvailability[depart]) {
      return "Ce depart bateau est indisponible. Choisis un autre depart.";
    }

    return "";
  }

  function verifierParticipants() {
    const responsable = participants[0];

    if (!responsable?.prenom.trim()) return "Indique le prenom du responsable.";
    if (!responsable.nom.trim()) return "Indique le nom du responsable.";
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

      if (participant.role === "mise_eau" && age < 12) {
        return "La mise a l'eau est reservee aux participants de 12 ans et plus.";
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
      setErreur(error?.message || "Impossible d'enregistrer la reservation.");
      setEnvoi(false);
      return;
    }

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
          ? "Ce creneau vient d'etre reserve. Choisissez un autre depart."
          : "Impossible de bloquer le creneau bateau."
      );
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
      setErreur("Erreur lors de la preparation du paiement.");
      setEnvoi(false);
      return;
    }

    setMessage("Reservation enregistree. Redirection vers PayZen...");

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

      <div className="mx-auto max-w-md space-y-5 px-4 py-5 md:max-w-5xl">
        <section className="rounded-[30px] border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <DateStep
            date={date}
            chargement={chargement || chargementBateau}
            placesRestantesMiseEau={placesRestantesMiseEau}
            placesRestantesObservateur={placesRestantesObservateur}
            onDateChange={handleDateChange}
          />
        </section>

        <section className="rounded-[30px] border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <DepartureStep
            depart={depart}
            availability={departAvailability}
            onDepartChange={setDepart}
          />
        </section>

        <section className="rounded-[30px] border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
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

        <section className="rounded-[30px] border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
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
