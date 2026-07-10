"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  type WhaleWatchingLocale,
  whaleWatchingTranslations,
} from "@/lib/i18n";
import { WhatsAppChannelCard } from "@/components/WhatsAppChannelCard";
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
  ageRenseigneMineurComplet,
  formatPrix,
  nouveauParticipant,
  prixParticipant,
  nettoyerParticipant,
} from "./lib/rules";
import type { Depart, Participant, Role } from "./lib/types";

type BaleinesPageClientProps = {
  locale?: WhaleWatchingLocale;
};

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

export function BaleinesPageClient({ locale = "fr" }: BaleinesPageClientProps) {
  const t = whaleWatchingTranslations[locale];
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
  }, [date, t.errors.loadBoatCalendar]);

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
          setErreur(payload.error || t.errors.loadBoatCalendar);
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
        setErreur(t.errors.loadBoatCalendar);
        setBoatSlots({});
      } finally {
        setChargementBateau(false);
      }
    }

    chargerCalendrierBateau();
  }, [date, t.errors.loadBoatCalendar]);

  async function chargerCapacitesBaleines(selectedDate: string) {
    const { data, error } = await supabase
      .from("reservations_baleines")
      .select("depart, participants, statut_paiement, paye")
      .eq("date_sortie", selectedDate)
      .or("paye.eq.true,statut_paiement.in.(paid,paye)");

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
        setErreur(t.errors.loadAvailability);
        setCapacitesDepart(emptyCapacities);
      } finally {
        setChargement(false);
      }
    }

    chargerPlaces();
  }, [date, t.errors.loadAvailability]);

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

        if (champ === "age") {
          return {
            ...participant,
            age: valeur as string,
          };
        }

        return nettoyerParticipant({
          ...participant,
          [champ]: valeur,
        });
      })
    );
  }

  function finaliserAgeParticipant(index: number) {
    setParticipants((anciens) =>
      anciens.map((participant, participantIndex) => {
        if (participantIndex !== index) return participant;

        if (ageRenseigneMineurComplet(participant.age)) {
          return nettoyerParticipant({
            ...participant,
            role: "observateur",
          });
        }

        return participant;
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

    if (!selectedDate) return t.errors.chooseDate;
    if (selectedDate < SAISON_DEBUT || selectedDate > SAISON_FIN) {
      return t.errors.season;
    }

    if (!departAvailability["07:00"] && !departAvailability["13:15"]) {
      return t.errors.noDeparture;
    }

    if (!departAvailability[depart]) {
      return t.errors.unavailableDeparture;
    }

    return "";
  }

  function verifierParticipants() {
    const responsable = participants[0];

    if (!responsable?.prenom.trim()) return t.errors.managerFirstName;
    if (!responsable.nom.trim()) return t.errors.managerLastName;
    if (!responsableEmail.trim()) return t.errors.managerEmail;
    if (!responsableTelephone.trim()) return t.errors.managerPhone;

    if (demandes.miseEau > placesRestantesMiseEau) {
      return t.errors.notEnoughSwimmers;
    }

    if (demandes.observateurs > placesRestantesObservateur) {
      return t.errors.notEnoughObservers;
    }

    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      const label = `${t.participantForm.participant} ${i + 1}`;

      if (!participant.prenom.trim()) {
        return `${label} : ${t.errors.participantFirstName}`;
      }
      if (!participant.nom.trim()) {
        return `${label} : ${t.errors.participantLastName}`;
      }
      if (!participant.age.trim()) {
        return `${label} : ${t.errors.participantAge}`;
      }

      const age = Number(participant.age);
      if (!Number.isFinite(age) || age <= 0 || age > 100) {
        return `${label} : ${t.errors.participantInvalidAge}`;
      }

      if (participant.role === "mise_eau" && age < 12) {
        return t.errors.minimumAge;
      }

      if (participant.role === "mise_eau" && !participant.materielPerso) {
        if (!participant.tailleCombinaison) {
          return `${label} : ${t.errors.wetsuitSize}`;
        }

        if (!participant.pointurePalmes) {
          return `${label} : ${t.errors.finSize}`;
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
        setErreur(t.errors.departureFull);
        setEnvoi(false);
        return;
      }
    } catch {
      setErreur(t.errors.verifyAvailability);
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
      setErreur(error?.message || t.errors.saveReservation);
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
            ? t.errors.slotReserved
            : t.errors.holdBoatSlot
        );
        setEnvoi(false);
        return;
      }
    } else if (!bateauDisponiblePourBaleines(selectedBoatSlot)) {
      setErreur(t.errors.slotReserved);
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
        returnUrl: `/baleines/success?reservationId=${data.id}&locale=${locale}`,
      }),
    });

    const paiement = await reponsePayzen.json();

    if (!reponsePayzen.ok) {
      console.error(paiement);
      setErreur(t.errors.preparePayment);
      setEnvoi(false);
      return;
    }

    setMessage(t.messages.reservationSaved);

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
      <BaleinesHero t={t} />
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 pt-6">
        <Link
          href={t.navigation.homeHref}
          className="inline-flex min-h-11 items-center rounded-full border border-cyan-100 bg-cyan-50 px-4 text-sm font-black text-cyan-800 transition hover:bg-cyan-100"
        >
          {t.navigation.backHome}
        </Link>
        <nav className="flex items-center gap-3 text-xs font-black text-cyan-800 md:text-sm">
          <Link
            href={t.navigation.frHref}
            className={locale === "fr" ? "text-cyan-950" : "text-cyan-700/60"}
          >
            FR
          </Link>
          <Link
            href={t.navigation.enHref}
            className={locale === "en" ? "text-cyan-950" : "text-cyan-700/60"}
          >
            EN
          </Link>
        </nav>
      </div>
      <div className="pt-6">
        <WhatsAppChannelCard locale={locale} />
      </div>
      <BaleinesVideo t={t} />

      <div className="mx-auto max-w-md space-y-8 px-4 py-8 md:max-w-5xl md:py-10">
        <BaleinesIntro t={t} />

        <section className="peche-reveal rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.10)] transition duration-300 hover:shadow-[0_22px_50px_rgba(8,145,178,0.13)] md:p-7">
          <DateStep
            date={date}
            chargement={chargement || chargementBateau}
            placesRestantesMiseEau={placesRestantesMiseEau}
            placesRestantesObservateur={placesRestantesObservateur}
            onDateChange={handleDateChange}
            t={t}
          />
        </section>

        <section className="peche-reveal rounded-3xl border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.10)] transition duration-300 hover:shadow-[0_22px_50px_rgba(8,145,178,0.13)] md:p-7">
          <DepartureStep
            depart={depart}
            availability={departAvailability}
            capacities={capacitesDepart}
            onDepartChange={setDepart}
            t={t}
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
            onParticipantAgeBlur={finaliserAgeParticipant}
            onEmailChange={setResponsableEmail}
            onTelephoneChange={setResponsableTelephone}
            onRemoveParticipant={supprimerParticipant}
            t={t}
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
            t={t}
          />
        </section>

        <BaleinesGallery t={t} />
        <BaleinesInfoCards t={t} />

        {erreur && (
          <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
            {erreur}
          </p>
        )}

        <p className="pb-6 text-center text-sm font-black text-cyan-800">
          {t.totalLabel} : {formatPrix(total)}
        </p>
      </div>
    </main>
  );
}

