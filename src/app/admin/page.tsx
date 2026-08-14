"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  MAX_MISE_EAU,
  MAX_OBSERVATEURS,
} from "@/app/baleines/lib/rules";
import type { Depart, Role } from "@/app/baleines/lib/types";
import { PECHE_FORMULAS, type FormulaId } from "@/components/peche/constants";
import { getPermisPricing } from "@/lib/permisPricing";
import { useAdminSession } from "@/hooks/useAdminSession";

type AdminReservation = {
  id: number;
  prenom: string | null;
  nom: string | null;
  prenom2: string | null;
  nom2: string | null;
  telephone: string | null;
  email: string | null;
  formule: string | null;
  examen: string | null;
  date_cours: string | null;
  creneau: string | null;
  paiement_effectue: boolean | null;
  pricing_type: string | null;
  pricing_amount: number | null;
  facture_numero: string | null;
  facture_url: string | null;
  email_sent: boolean | null;
  email_sent_at: string | null;
  statut: string | null;
  created_at?: string | null;
  certificat_url: string | null;
  formulaire_url: string | null;
  photo_url: string | null;
  identite_url: string | null;
  archived: boolean;
  archived_at: string | null;
  mode_paiement: string | null;
  reference_paiement: string | null;
  paid_at: string | null;
  origine_reservation: string | null;
};

type ExamenBloque = {
  id: string;
  date_examen: string;
  motif: string | null;
};

type AdminPecheReservation = {
  id: string;
  date_sortie: string | null;
  formule: string | null;
  origine: string | null;
  responsable_prenom: string | null;
  responsable_nom: string | null;
  responsable_telephone: string | null;
  responsable_email: string | null;
  nombre_personnes: number | null;
  montant_paye: number | null;
  type_paiement: string | null;
  statut_paiement: string | null;
  paye: boolean | null;
  commentaire: string | null;
  facture_numero: string | null;
  facture_url: string | null;
  email_sent: boolean | null;
  email_sent_at: string | null;
};

type BaleinesParticipant = {
  prenom?: string | null;
  nom?: string | null;
  age?: string | null;
  role?: string | null;
  materielPerso?: boolean | null;
  tailleCombinaison?: string | null;
  pointurePalmes?: string | null;
  type?: string | null;
  origine?: string | null;
  commentaire?: string | null;
  reservation_manuelle?: boolean | null;
};

type BoatSlotStatus = "available" | "hold" | "reserved" | "blocked";
type BoatSlotName = "morning" | "afternoon";
type BoatCalendarSlot = {
  date: string;
  slot: BoatSlotName;
  status: BoatSlotStatus;
  activity: "baleines" | "peche" | "peche_nuit" | null;
};

type AdminBaleinesReservation = {
  id: string;
  date_sortie: string | null;
  depart: string | null;
  responsable_prenom: string | null;
  responsable_nom: string | null;
  responsable_telephone: string | null;
  responsable_email: string | null;
  participants: BaleinesParticipant[] | null;
  montant_total: number | null;
  statut_paiement: string | null;
  paye: boolean | null;
  facture_numero: string | null;
  facture_url: string | null;
  email_sent: boolean | null;
  email_sent_at: string | null;
  source_paiement: string | null;
};

type ManualBaleinesReservationForm = {
  dateSortie: string;
  depart: Depart;
  origine: string;
  responsablePrenom: string;
  responsableNom: string;
  telephone: string;
  email: string;
  nombreMiseEau: string;
  nombreObservateurs: string;
  commentaire: string;
};

type ManualPecheReservationForm = {
  dateSortie: string;
  formule: FormulaId;
  origine: string;
  responsablePrenom: string;
  responsableNom: string;
  telephone: string;
  email: string;
  nombreParticipants: string;
  commentaire: string;
};

const initialManualPecheForm: ManualPecheReservationForm = {
  dateSortie: "",
  formule: "morning",
  origine: "",
  responsablePrenom: "",
  responsableNom: "",
  telephone: "",
  email: "",
  nombreParticipants: "1",
  commentaire: "",
};

const initialManualBaleinesForm: ManualBaleinesReservationForm = {
  dateSortie: "",
  depart: "07:00",
  origine: "",
  responsablePrenom: "",
  responsableNom: "",
  telephone: "",
  email: "",
  nombreMiseEau: "0",
  nombreObservateurs: "0",
  commentaire: "",
};

const baleinesDepartSlots: Record<Depart, BoatSlotName> = {
  "07:00": "morning",
  "13:15": "afternoon",
};

const pecheFormulaLabels: Record<FormulaId, string> = {
  morning: "Demi-journee matin",
  afternoon: "Demi-journee apres-midi",
  full_day: "Journee complete",
};

const pecheAdminSelect =
  "id,date_sortie,formule,origine,responsable_prenom,responsable_nom,responsable_telephone,responsable_email,nombre_personnes,montant_paye,type_paiement,statut_paiement,paye,commentaire,facture_numero,facture_url,email_sent,email_sent_at";

const pecheAdminFallbackSelect =
  "id,date_sortie,formule,responsable_prenom,responsable_nom,responsable_telephone,responsable_email,nombre_personnes,montant_paye,type_paiement,statut_paiement,paye,facture_numero,facture_url,email_sent,email_sent_at";

const pricingTypeLabels: Record<string, string> = {
  normal: "Tarif normal",
  promo_internet: "Promo Internet",
  salon_tourisme: "Salon du Tourisme",
};

function formatPricingType(value: string | null) {
  return pricingTypeLabels[value || "normal"] || pricingTypeLabels.normal;
}

function formatPermisPaymentMode(value: string | null) {
  return {
    payzen: "PayZen",
    especes: "Espèces",
    cheque: "Chèque",
    tpe: "Carte bancaire – TPE",
  }[value || "payzen"] || "PayZen";
}

function formatPecheFormula(value: string | null) {
  if (value === "morning" || value === "afternoon" || value === "full_day") {
    return pecheFormulaLabels[value];
  }

  return value || "-";
}

function formatPechePayment(
  statutPaiement: string | null,
  typePaiement: string | null
) {
  if (
    statutPaiement === "paiement_externe_a_facturer" ||
    typePaiement === "external_invoice"
  ) {
    return "paiement externe / a facturer";
  }

  return statutPaiement || "-";
}

function canCancelPecheReservation(reservation: AdminPecheReservation) {
  if (
    reservation.statut_paiement === "paiement_externe_a_facturer" ||
    reservation.type_paiement === "external_invoice"
  ) {
    return true;
  }
  if (reservation.statut_paiement === "cancelled") return false;

  return (
    reservation.paye !== true &&
    reservation.statut_paiement !== "paid" &&
    reservation.statut_paiement !== "paye"
  );
}

function formatXpf(value: number | null) {
  return value ? `${value.toLocaleString("fr-FR")} XPF` : "-";
}

function numberXpf(value: number) {
  return `${value.toLocaleString("fr-FR")} XPF`;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function countParticipants(participants: BaleinesParticipant[] | null) {
  return Array.isArray(participants) ? participants.length : 0;
}

function countBaleinesRole(
  participants: BaleinesParticipant[] | null,
  role: Role
) {
  if (!Array.isArray(participants)) return 0;

  return participants.filter((participant) => participant.role === role).length;
}

function getBaleinesManualOrigin(participants: BaleinesParticipant[] | null) {
  if (!Array.isArray(participants)) return "";

  return participants.find((participant) => participant.origine)?.origine || "";
}

function getBaleinesManualComment(participants: BaleinesParticipant[] | null) {
  if (!Array.isArray(participants)) return "";

  return (
    participants.find((participant) => participant.commentaire)?.commentaire || ""
  );
}

function isBaleinesBoatSlotAvailable(slot: BoatCalendarSlot | undefined) {
  if (!slot || slot.status === "available") return true;
  if (slot.status === "blocked") return false;

  return slot.activity === "baleines";
}

function makeManualBaleinesParticipants(
  miseEau: number,
  observateurs: number,
  origine: string,
  commentaire: string
): BaleinesParticipant[] {
  const metadata = {
    origine,
    commentaire,
    reservation_manuelle: true,
  };

  return [
    ...Array.from({ length: miseEau }, (_, index) => ({
      prenom: `Mise a l'eau ${index + 1}`,
      nom: origine,
      role: "mise_eau",
      ...metadata,
    })),
    ...Array.from({ length: observateurs }, (_, index) => ({
      prenom: `Observateur ${index + 1}`,
      nom: origine,
      role: "observateur",
      ...metadata,
    })),
  ];
}

function dateKey(value: string | null | undefined) {
  if (!value) return "";

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split("/");
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameDay(value: string | null | undefined, today: string) {
  return dateKey(value) === today;
}

function isThisWeek(value: string | null | undefined, start: Date, end: Date) {
  const key = dateKey(value);
  if (!key) return false;
  const date = new Date(`${key}T00:00:00`);
  return date >= start && date <= end;
}

function isThisMonth(value: string | null | undefined, monthKey: string) {
  return dateKey(value).startsWith(monthKey);
}

function permisStudentCount(reservation: AdminReservation) {
  return 1 + (reservation.prenom2 || reservation.nom2 ? 1 : 0);
}

export default function AdminPage() {
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [reservationsPeche, setReservationsPeche] = useState<
    AdminPecheReservation[]
  >([]);
  const [reservationsBaleines, setReservationsBaleines] = useState<
    AdminBaleinesReservation[]
  >([]);
  const [reservationBaleinesDetail, setReservationBaleinesDetail] =
    useState<AdminBaleinesReservation | null>(null);
  const [filtreStatut, setFiltreStatut] = useState("Tous");
  const [vuePermis, setVuePermis] = useState<"actives" | "archives">("actives");
  const [actionPermisEnCours, setActionPermisEnCours] = useState("");
  const [messageActionPermis, setMessageActionPermis] = useState("");
  const [erreurActionPermis, setErreurActionPermis] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const {
    authenticated: accesAutorise,
    checking: verificationSession,
    login: connecterAdmin,
    logout: deconnecterAdmin,
  } = useAdminSession();

  const [dateExamenBloquee, setDateExamenBloquee] = useState("");
  const [motifBlocage, setMotifBlocage] = useState("");
  const [examensBloques, setExamensBloques] = useState<ExamenBloque[]>([]);
  const [reservationBaleinesManuelle, setReservationBaleinesManuelle] =
    useState<ManualBaleinesReservationForm>(initialManualBaleinesForm);
  const [reservationPecheManuelle, setReservationPecheManuelle] =
    useState<ManualPecheReservationForm>(initialManualPecheForm);
  const [creationPecheEnCours, setCreationPecheEnCours] = useState(false);
  const [messagePecheManuel, setMessagePecheManuel] = useState("");
  const [erreurPecheManuel, setErreurPecheManuel] = useState("");
  const [creationBaleinesEnCours, setCreationBaleinesEnCours] =
    useState(false);
  const [messageBaleinesManuel, setMessageBaleinesManuel] = useState("");
  const [erreurBaleinesManuel, setErreurBaleinesManuel] = useState("");
  const [annulationEnCours, setAnnulationEnCours] = useState("");
  const [erreurAnnulation, setErreurAnnulation] = useState("");
  const [suppressionBaleinesEnCours, setSuppressionBaleinesEnCours] =
    useState("");

  useEffect(() => {
    if (!accesAutorise) return;

    chargerReservations();
    chargerReservationsPeche();
    chargerReservationsBaleines();
    chargerExamensBloques();
  }, [accesAutorise]);

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

  async function chargerReservationsPeche() {
    const result = await supabase
      .from("reservations_peche")
      .select(pecheAdminSelect)
      .order("date_sortie", { ascending: false });

    if (result.error?.code === "PGRST204") {
      const fallback = await supabase
        .from("reservations_peche")
        .select(pecheAdminFallbackSelect)
        .order("date_sortie", { ascending: false });

      if (fallback.error) {
        console.error(fallback.error);
        return;
      }

      setReservationsPeche((fallback.data || []) as AdminPecheReservation[]);
      return;
    }

    if (result.error) {
      console.error(result.error);
      return;
    }

    setReservationsPeche((result.data || []) as AdminPecheReservation[]);
  }

  async function chargerReservationsBaleines() {
    const { data, error } = await supabase
      .from("reservations_baleines")
      .select(
        "id,date_sortie,depart,responsable_prenom,responsable_nom,responsable_telephone,responsable_email,participants,montant_total,statut_paiement,paye,facture_numero,facture_url,email_sent,email_sent_at,source_paiement"
      )
      .order("date_sortie", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setReservationsBaleines((data || []) as AdminBaleinesReservation[]);
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

  async function annulerReservationBateau(
    reservationTable: "reservations_peche" | "reservations_baleines",
    reservationId: string
  ) {
    if (!window.confirm("Confirmer l'annulation de cette reservation ?")) {
      return;
    }

    const key = `${reservationTable}:${reservationId}`;
    setErreurAnnulation("");
    setAnnulationEnCours(key);

    try {
      const response = await fetch("/api/admin/reservation/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reservationTable, reservationId }),
      });
      const payload = await response.json();
      console.error("Reponse annulation reservation admin", {
        ok: response.ok,
        status: response.status,
        payload,
        reservationTable,
        reservationId,
      });

      if (!response.ok) {
        setErreurAnnulation(
          payload.error || "Impossible d'annuler la reservation."
        );
        return;
      }

      if (reservationTable === "reservations_peche") {
        await chargerReservationsPeche();
      } else {
        await chargerReservationsBaleines();
      }
    } catch (error) {
      console.error(error);
      setErreurAnnulation("Impossible d'annuler la reservation.");
    } finally {
      setAnnulationEnCours("");
    }
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

  async function supprimerReservationBaleines(
    reservation: AdminBaleinesReservation
  ) {
    const reservationPayee = !canDeleteBaleinesReservation(reservation);
    const confirmation = reservationPayee
      ? "Attention : cette réservation est enregistrée comme payée.\n\nVous êtes sur le point de la supprimer définitivement, ainsi que ses participants et sa facture éventuelle.\n\nCette action est irréversible.\n\nVoulez-vous vraiment continuer ?"
      : "Cette réservation n'a jamais été payée.\n\nVoulez-vous vraiment la supprimer ?\n\nCette action est définitive.";

    if (!window.confirm(confirmation)) {
      return;
    }

    setErreurAnnulation("");
    setSuppressionBaleinesEnCours(reservation.id);

    try {
      const response = await fetch(
        `/api/admin/baleines/${encodeURIComponent(reservation.id)}`,
        { method: "DELETE" }
      );
      const payload = await response.json();

      if (!response.ok) {
        setErreurAnnulation(
          payload.error || "Impossible de supprimer la réservation."
        );
        return;
      }

      setReservationsBaleines((actuelles) =>
        actuelles.filter((item) => item.id !== reservation.id)
      );
    } catch {
      setErreurAnnulation("Impossible de supprimer la réservation.");
    } finally {
      setSuppressionBaleinesEnCours("");
    }
  }

  async function supprimerReservationPermis(reservation: AdminReservation) {
    if (reservation.paiement_effectue !== false) return;

    if (
      !window.confirm(
        "Cette réservation n'a jamais été payée.\nVoulez-vous vraiment la supprimer ?\nCette action est définitive."
      )
    ) {
      return;
    }

    const actionKey = `delete:${reservation.id}`;
    setActionPermisEnCours(actionKey);
    setMessageActionPermis("");
    setErreurActionPermis("");

    try {
      const response = await fetch(
        `/api/admin/permis/${encodeURIComponent(reservation.id)}`,
        { method: "DELETE" }
      );
      const payload = await response.json();

      if (!response.ok) {
        setErreurActionPermis(
          payload.error || "Impossible de supprimer la réservation."
        );
        return;
      }

      setReservations((actuelles) =>
        actuelles.filter((item) => item.id !== reservation.id)
      );
      setMessageActionPermis(
        payload.warning || "La réservation non payée a été supprimée."
      );
    } catch {
      setErreurActionPermis("Impossible de supprimer la réservation.");
    } finally {
      setActionPermisEnCours("");
    }
  }

  async function archiverReservationPermis(reservation: AdminReservation) {
    if (
      reservation.paiement_effectue !== true ||
      reservation.statut !== "Permis obtenu"
    ) {
      return;
    }

    if (
      !window.confirm(
        "Archiver ce dossier ?\nIl disparaîtra de la liste principale mais restera consultable dans les archives."
      )
    ) {
      return;
    }

    await mettreAJourArchivePermis(reservation, "archive");
  }

  async function restaurerReservationPermis(reservation: AdminReservation) {
    await mettreAJourArchivePermis(reservation, "restore");
  }

  async function mettreAJourArchivePermis(
    reservation: AdminReservation,
    action: "archive" | "restore"
  ) {
    const actionKey = `${action}:${reservation.id}`;
    setActionPermisEnCours(actionKey);
    setMessageActionPermis("");
    setErreurActionPermis("");

    try {
      const response = await fetch(
        `/api/admin/permis/${encodeURIComponent(reservation.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      const payload = await response.json();

      if (!response.ok || !payload.reservation) {
        setErreurActionPermis(
          payload.error || "Impossible de mettre à jour le dossier."
        );
        return;
      }

      setReservations((actuelles) =>
        actuelles.map((item) =>
          item.id === reservation.id
            ? { ...item, ...payload.reservation }
            : item
        )
      );
      setMessageActionPermis(
        action === "archive"
          ? "Le dossier a été archivé."
          : "Le dossier a été restauré dans les réservations actives."
      );
    } catch {
      setErreurActionPermis("Impossible de mettre à jour le dossier.");
    } finally {
      setActionPermisEnCours("");
    }
  }

  function modifierReservationBaleinesManuelle(
    champ: keyof ManualBaleinesReservationForm,
    valeur: string
  ) {
    setReservationBaleinesManuelle((reservation) => ({
      ...reservation,
      [champ]: valeur,
    }));
  }

  function modifierReservationPecheManuelle(
    champ: keyof ManualPecheReservationForm,
    valeur: string
  ) {
    setReservationPecheManuelle((reservation) => ({
      ...reservation,
      [champ]: valeur,
    }));
  }

  async function ajouterReservationPecheManuelle() {
    if (creationPecheEnCours) return;

    setMessagePecheManuel("");
    setErreurPecheManuel("");

    const form = reservationPecheManuelle;
    const participants = Number(form.nombreParticipants);

    if (!form.dateSortie) {
      setErreurPecheManuel("Choisissez une date de sortie.");
      return;
    }

    if (!form.origine.trim()) {
      setErreurPecheManuel("Indiquez le nom ou l'origine.");
      return;
    }

    if (!form.responsablePrenom.trim() || !form.responsableNom.trim()) {
      setErreurPecheManuel("Indiquez le prenom et le nom du responsable.");
      return;
    }

    if (!form.telephone.trim()) {
      setErreurPecheManuel("Indiquez le telephone.");
      return;
    }

    if (!Number.isInteger(participants) || participants < 1 || participants > 4) {
      setErreurPecheManuel("Indiquez entre 1 et 4 participants.");
      return;
    }

    setCreationPecheEnCours(true);

    try {
      const response = await fetch("/api/admin/peche/manual-reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.dateSortie,
          formulaId: form.formule,
          origin: form.origine,
          firstName: form.responsablePrenom,
          lastName: form.responsableNom,
          phone: form.telephone,
          email: form.email,
          peopleCount: participants,
          comment: form.commentaire,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setErreurPecheManuel(
          payload.error || "Impossible de creer la reservation Peche."
        );
        return;
      }

      setReservationPecheManuelle(initialManualPecheForm);
      setMessagePecheManuel("Reservation Peche manuelle creee.");
      await chargerReservationsPeche();
    } catch (error) {
      console.error(error);
      setErreurPecheManuel("Impossible de creer la reservation Peche manuelle.");
    } finally {
      setCreationPecheEnCours(false);
    }
  }

  async function ajouterReservationBaleinesManuelle() {
    if (creationBaleinesEnCours) return;

    setMessageBaleinesManuel("");
    setErreurBaleinesManuel("");

    const form = reservationBaleinesManuelle;
    const miseEau = Number(form.nombreMiseEau);
    const observateurs = Number(form.nombreObservateurs);
    const depart = form.depart;
    const slotName = baleinesDepartSlots[depart];

    if (!form.dateSortie) {
      setErreurBaleinesManuel("Choisissez une date de sortie.");
      return;
    }

    if (!form.origine.trim()) {
      setErreurBaleinesManuel("Indiquez le nom ou l'origine.");
      return;
    }

    if (!form.responsablePrenom.trim() || !form.responsableNom.trim()) {
      setErreurBaleinesManuel("Indiquez le prenom et le nom du responsable.");
      return;
    }

    if (!form.telephone.trim()) {
      setErreurBaleinesManuel("Indiquez le telephone.");
      return;
    }

    if (
      !Number.isInteger(miseEau) ||
      !Number.isInteger(observateurs) ||
      miseEau < 0 ||
      observateurs < 0 ||
      miseEau + observateurs <= 0
    ) {
      setErreurBaleinesManuel("Indiquez au moins une place a reserver.");
      return;
    }

    if (miseEau > MAX_MISE_EAU || observateurs > MAX_OBSERVATEURS) {
      setErreurBaleinesManuel("La demande depasse la capacite du depart.");
      return;
    }

    setCreationBaleinesEnCours(true);

    try {
      const reservationsExistantes = await supabase
        .from("reservations_baleines")
        .select("participants,statut_paiement")
        .eq("date_sortie", form.dateSortie)
        .eq("depart", depart)
        .in("statut_paiement", ["pending", "paid", "paye"]);

      if (reservationsExistantes.error) {
        setErreurBaleinesManuel("Impossible de verifier les places restantes.");
        return;
      }

      const capaciteOccupee = (reservationsExistantes.data || []).reduce(
        (total, reservation) => {
          const participants =
            reservation.participants as BaleinesParticipant[] | null;

          return {
            miseEau:
              total.miseEau + countBaleinesRole(participants, "mise_eau"),
            observateurs:
              total.observateurs +
              countBaleinesRole(participants, "observateur"),
          };
        },
        { miseEau: 0, observateurs: 0 }
      );

      if (
        capaciteOccupee.miseEau + miseEau > MAX_MISE_EAU ||
        capaciteOccupee.observateurs + observateurs > MAX_OBSERVATEURS
      ) {
        setErreurBaleinesManuel(
          `Places insuffisantes. Restant : ${
            MAX_MISE_EAU - capaciteOccupee.miseEau
          } mise a l'eau, ${
            MAX_OBSERVATEURS - capaciteOccupee.observateurs
          } observateur(s).`
        );
        return;
      }

      const calendarResponse = await fetch(
        `/api/bateau/calendar?from=${form.dateSortie}&to=${form.dateSortie}`
      );
      const calendarPayload = await calendarResponse.json();

      if (!calendarResponse.ok) {
        setErreurBaleinesManuel(
          calendarPayload.error || "Impossible de verifier le bateau."
        );
        return;
      }

      const boatSlot = Array.isArray(calendarPayload.slots)
        ? (calendarPayload.slots as BoatCalendarSlot[]).find(
            (slot) => slot.slot === slotName
          )
        : undefined;

      if (!isBaleinesBoatSlotAvailable(boatSlot)) {
        setErreurBaleinesManuel("Ce depart bateau est indisponible.");
        return;
      }

      const reservation = {
        date_sortie: form.dateSortie,
        depart,
        responsable_prenom: form.responsablePrenom.trim(),
        responsable_nom: form.responsableNom.trim(),
        responsable_email: form.email.trim() || null,
        responsable_telephone: form.telephone.trim(),
        participants: makeManualBaleinesParticipants(
          miseEau,
          observateurs,
          form.origine.trim(),
          form.commentaire.trim()
        ),
        nombre_mise_eau: miseEau,
        nombre_observateurs: observateurs,
        montant_total: 0,
        devise: "XPF",
        statut_paiement: "pending",
        paye: false,
        source_paiement: "paiement_externe_a_facturer",
        created_at: new Date().toISOString(),
      };

      const insertion = await supabase
        .from("reservations_baleines")
        .insert(reservation)
        .select("id")
        .single();

      if (insertion.error || !insertion.data?.id) {
        setErreurBaleinesManuel(
          insertion.error?.message || "Impossible de creer la reservation."
        );
        return;
      }

      if (!boatSlot || boatSlot.status === "available") {
        const holdResponse = await fetch("/api/bateau/hold", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activity: "baleines",
            reservationTable: "reservations_baleines",
            reservationId: insertion.data.id,
            date: form.dateSortie,
            slots: [slotName],
          }),
        });
        const holdPayload = await holdResponse.json();

        if (!holdResponse.ok) {
          console.error(holdPayload);
          setErreurBaleinesManuel(
            holdResponse.status === 409
              ? "Ce depart bateau vient d'etre reserve."
              : "Reservation creee, mais le bateau n'a pas pu etre bloque."
          );
          await chargerReservationsBaleines();
          return;
        }

        const confirmResponse = await fetch("/api/bateau/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activity: "baleines",
            reservationTable: "reservations_baleines",
            reservationId: insertion.data.id,
            date: form.dateSortie,
            slots: [slotName],
          }),
        });
        const confirmPayload = await confirmResponse.json();

        if (!confirmResponse.ok) {
          console.error(confirmPayload);
          setErreurBaleinesManuel(
            "Reservation creee, mais le bateau n'a pas pu etre confirme."
          );
          await chargerReservationsBaleines();
          return;
        }
      }

      setReservationBaleinesManuelle(initialManualBaleinesForm);
      setMessageBaleinesManuel("Reservation Baleines manuelle creee.");
      await chargerReservationsBaleines();
    } catch (error) {
      console.error(error);
      setErreurBaleinesManuel("Impossible de creer la reservation manuelle.");
    } finally {
      setCreationBaleinesEnCours(false);
    }
  }

  const reservationsVue = reservations.filter((reservation) =>
    vuePermis === "archives" ? reservation.archived : !reservation.archived
  );
  const reservationsFiltrees = reservationsVue.filter((reservation) =>
    filtreStatut === "Tous" ? true : reservation.statut === filtreStatut
  );
  const reservationsPromoInternet = reservations.filter(
    (reservation) => reservation.pricing_type === "promo_internet"
  );
  const permisPricing = getPermisPricing({
    promotionReservationsSold: reservationsPromoInternet.length,
  });
  const now = new Date();
  const todayKey = dateKey(now.toISOString());
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const monthKey = todayKey.slice(0, 7);
  const pecheToday = reservationsPeche.filter((reservation) =>
    isSameDay(reservation.date_sortie, todayKey)
  );
  const baleinesToday = reservationsBaleines.filter((reservation) =>
    isSameDay(reservation.date_sortie, todayKey)
  );
  const permisToday = reservations.filter((reservation) =>
    isSameDay(reservation.date_cours, todayKey)
  );
  const pecheWeek = reservationsPeche.filter((reservation) =>
    isThisWeek(reservation.date_sortie, weekStart, weekEnd)
  );
  const baleinesWeek = reservationsBaleines.filter((reservation) =>
    isThisWeek(reservation.date_sortie, weekStart, weekEnd)
  );
  const permisWeek = reservations.filter((reservation) =>
    isThisWeek(reservation.created_at, weekStart, weekEnd)
  );
  const pecheMonth = reservationsPeche.filter((reservation) =>
    isThisMonth(reservation.date_sortie, monthKey)
  );
  const baleinesMonth = reservationsBaleines.filter((reservation) =>
    isThisMonth(reservation.date_sortie, monthKey)
  );
  const permisMonth = reservations.filter((reservation) =>
    isThisMonth(reservation.created_at, monthKey)
  );
  const caPeche = pecheMonth.reduce(
    (total, reservation) => total + (reservation.montant_paye || 0),
    0
  );
  const caBaleines = baleinesMonth.reduce(
    (total, reservation) => total + (reservation.montant_total || 0),
    0
  );
  const caPermis = permisMonth.reduce(
    (total, reservation) =>
      total + (reservation.paiement_effectue ? reservation.pricing_amount || 0 : 0),
    0
  );
  const documentsIncomplets = reservations.filter(
    (reservation) =>
      !reservation.certificat_url ||
      !reservation.formulaire_url ||
      !reservation.photo_url ||
      !reservation.identite_url
  ).length;
  const paiementsEnAttente =
    reservations.filter((reservation) => !reservation.paiement_effectue).length +
    reservationsPeche.filter(
      (reservation) => reservation.statut_paiement !== "paid"
    ).length +
    reservationsBaleines.filter(
      (reservation) => reservation.statut_paiement !== "paid"
    ).length;
  const emailsNonEnvoyes =
    reservations.filter((reservation) => !reservation.email_sent).length +
    reservationsPeche.filter((reservation) => !reservation.email_sent).length +
    reservationsBaleines.filter((reservation) => !reservation.email_sent).length;
  const sortiesCompletes =
    reservationsPeche.filter(
      (reservation) => (reservation.nombre_personnes || 0) >= 4
    ).length +
    reservationsBaleines.filter(
      (reservation) => countParticipants(reservation.participants) >= 8
    ).length;
  const alerts = [
    documentsIncomplets
      ? `${documentsIncomplets} dossier(s) Permis avec documents incomplets`
      : "",
    paiementsEnAttente ? `${paiementsEnAttente} paiement(s) en attente` : "",
    emailsNonEnvoyes ? `${emailsNonEnvoyes} email(s) non envoyes` : "",
    sortiesCompletes ? `${sortiesCompletes} sortie(s) complete(s)` : "",
  ].filter(Boolean);

  if (verificationSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <p className="font-bold text-cyan-900">Vérification de la session…</p>
      </main>
    );
  }

  if (!accesAutorise) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 flex items-center justify-center">
        <div className="bg-white text-slate-900 rounded-2xl p-6 max-w-md w-full shadow">
          <h1 className="text-3xl font-bold mb-6">Accès admin</h1>

          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const resultat = await connecterAdmin(motDePasse);
              if (!resultat.ok) alert(resultat.error);
            }}
          >
            <input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="Mot de passe"
              className="w-full border rounded-xl p-3 mb-4"
            />

            <button
              type="submit"
              className="w-full cursor-pointer bg-sky-800 text-white font-bold p-3 rounded-xl"
            >
              Entrer
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 p-4 md:p-8">
      <section className="mb-10 overflow-hidden rounded-[2rem] border border-cyan-100 bg-cyan-50/60 p-5 shadow-sm md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-700">
              Espace de gestion
            </p>
            <h1 className="mt-2 text-3xl font-black text-cyan-950 md:text-5xl">
              Administration Tahiti Trip
            </h1>
            <p className="mt-4 max-w-3xl font-semibold leading-7 text-slate-600">
              Gérez les réservations, les carnets, les disponibilités et les
              activités depuis un seul espace.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <button
              type="button"
              onClick={() => void deconnecterAdmin()}
              className="min-h-11 rounded-xl border border-cyan-200 bg-white px-4 text-sm font-black text-cyan-900"
            >
              Déconnexion
            </button>
            <p className="text-sm font-semibold text-slate-500">
              Aujourd&apos;hui : {todayKey.split("-").reverse().join("/")}
            </p>
          </div>
        </div>

        <nav
          className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          aria-label="Modules d’administration"
        >
          <AdminModuleCard
            href="/admin/carnets-baleines"
            icon="🐋"
            title="Carnets Baleines"
            description="Gérer les carnets, crédits, paiements et factures."
          />
          <AdminModuleCard
            href="#reservations-baleines"
            icon="🌊"
            title="Réservations Baleines"
            description="Consulter et gérer les réservations Baleines."
          />
          <AdminModuleCard
            href="/admin/bateau"
            icon="⛵"
            title="Calendrier bateau"
            description="Bloquer des dates et visualiser les disponibilités du bateau."
          />
          <AdminModuleCard
            href="/admin/charter"
            icon="🛥️"
            title="Réservations Charter"
            description="Consulter et créer les réservations Charter privées."
          />
          <AdminModuleCard
            href="#reservations-peche"
            icon="🎣"
            title="Réservations Pêche"
            description="Consulter les réservations de pêche au gros."
          />
          <AdminModuleCard
            href="#reservations-permis"
            icon="⚓"
            title="Permis côtier"
            description="Gérer les candidats, cours pratiques et examens."
          />
        </nav>

        <div className="mt-10 border-t border-cyan-100 pt-8">
          <h2 className="text-2xl font-black text-cyan-950">
            Aperçu de l’activité
          </h2>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <DashboardCard
            icon="🎣"
            title="Pêche aujourd'hui"
            primary={`${pecheToday.length} sortie(s)`}
            secondary={`${pecheToday.reduce(
              (total, reservation) => total + (reservation.nombre_personnes || 0),
              0
            )} client(s)`}
          />
          <DashboardCard
            icon="🐋"
            title="Baleines aujourd'hui"
            primary={`${baleinesToday.length} sortie(s)`}
            secondary={`${baleinesToday.reduce(
              (total, reservation) =>
                total + countParticipants(reservation.participants),
              0
            )} participant(s)`}
          />
          <DashboardCard
            icon="📘"
            title="Permis aujourd'hui"
            primary={`${permisToday.length} cours`}
            secondary={`${permisToday.reduce(
              (total, reservation) => total + permisStudentCount(reservation),
              0
            )} eleve(s)`}
          />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <section className="rounded-3xl border border-cyan-100 bg-white p-5">
            <h2 className="text-lg font-black text-cyan-950">Cette semaine</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <MiniMetric label="Pêche" value={pecheWeek.length} />
              <MiniMetric label="Baleines" value={baleinesWeek.length} />
              <MiniMetric label="Permis" value={permisWeek.length} />
            </div>
          </section>

          <section className="rounded-3xl border border-cyan-100 bg-white p-5">
            <h2 className="text-lg font-black text-cyan-950">Ce mois</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MiniMetric label="CA Pêche" value={numberXpf(caPeche)} />
              <MiniMetric label="CA Baleines" value={numberXpf(caBaleines)} />
              <MiniMetric label="CA Permis" value={numberXpf(caPermis)} />
              <MiniMetric
                label="Total encaissé"
                value={numberXpf(caPeche + caBaleines + caPermis)}
              />
              <MiniMetric
                label="Réservations"
                value={
                  pecheMonth.length + baleinesMonth.length + permisMonth.length
                }
              />
            </div>
          </section>
        </div>

        <div className="mt-5">
          <section className="rounded-3xl border border-cyan-100 bg-white p-5 text-slate-950">
            <h2 className="text-lg font-black text-cyan-950">Alertes</h2>
            {alerts.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700">
                ✅ Aucune alerte.
              </p>
            ) : (
              <div className="mt-4 grid gap-3">
                {alerts.map((alert) => (
                  <p
                    key={alert}
                    className="rounded-2xl bg-amber-50 p-4 font-bold text-amber-800"
                  >
                    ⚠ {alert}
                  </p>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
      <div id="reservations-permis" className="mb-6 flex scroll-mt-6 flex-col justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-3xl font-bold md:text-4xl">Réservations Permis Côtier</h1>
        <Link href="/admin/permis/nouvelle-reservation" className="rounded-xl bg-green-700 px-5 py-3 text-center font-bold text-white shadow">
          + Nouvelle réservation Permis
        </Link>
      </div>

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

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setVuePermis("actives");
            setFiltreStatut("Tous");
          }}
          className={`rounded-xl px-5 py-3 font-bold ${
            vuePermis === "actives"
              ? "bg-sky-800 text-white"
              : "border border-slate-200 bg-white text-slate-700"
          }`}
        >
          Réservations actives
        </button>
        <button
          type="button"
          onClick={() => {
            setVuePermis("archives");
            setFiltreStatut("Tous");
          }}
          className={`rounded-xl px-5 py-3 font-bold ${
            vuePermis === "archives"
              ? "bg-sky-800 text-white"
              : "border border-slate-200 bg-white text-slate-700"
          }`}
        >
          Archives
        </button>
      </div>

      {messageActionPermis && (
        <p className="mb-6 rounded-xl bg-green-100 p-4 font-bold text-green-800">
          {messageActionPermis}
        </p>
      )}
      {erreurActionPermis && (
        <p className="mb-6 rounded-xl bg-red-100 p-4 font-bold text-red-800">
          {erreurActionPermis}
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl p-4 font-bold">
          Total : {reservationsVue.length}
        </div>

        <div className="bg-yellow-100 text-yellow-800 rounded-xl p-4 font-bold">
          En attente :{" "}
          {reservationsVue.filter((r) => r.statut === "En attente").length}
        </div>

        <div className="bg-green-100 text-green-800 rounded-xl p-4 font-bold">
          Validés :{" "}
          {reservationsVue.filter((r) => r.statut === "Validé").length}
        </div>

        <div className="bg-blue-100 text-blue-800 rounded-xl p-4 font-bold">
          Permis obtenus :{" "}
          {reservationsVue.filter((r) => r.statut === "Permis obtenu").length}
        </div>

        <div className="bg-orange-100 text-orange-900 rounded-xl p-4 font-bold">
          Promo vendus : {permisPricing.promotionReservationsSold}
        </div>

        <div className="bg-cyan-100 text-cyan-900 rounded-xl p-4 font-bold">
          Promo restants : {permisPricing.promotionsRemaining}
        </div>
      </div>

      <section className="mb-6 bg-white rounded-xl p-4 shadow">
        <h2 className="text-xl font-bold">Tarification permis active</h2>
        <p className="mt-2 font-semibold">
          Type de tarif : {permisPricing.pricingType}
        </p>
      </section>

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
              <strong>Tarif :</strong>{" "}
              {formatPricingType(reservation.pricing_type)} -{" "}
              {formatXpf(reservation.pricing_amount)}
            </p>
            <p>
              <strong>Facture :</strong>{" "}
              {reservation.facture_numero || "-"}
            </p>
            <p>
              <strong>Email :</strong>{" "}
              {reservation.email_sent ? "envoyé" : "non envoyé"}
              {reservation.email_sent_at
                ? ` - ${formatDateTime(reservation.email_sent_at)}`
                : ""}
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
            <p><strong>Origine :</strong> {reservation.origine_reservation === "salon_admin" ? "Salon" : "Site"}</p>
            <p><strong>Mode :</strong> {formatPermisPaymentMode(reservation.mode_paiement)}</p>
            {reservation.reference_paiement && <p><strong>Référence :</strong> {reservation.reference_paiement}</p>}

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
              <button
                onClick={() => ouvrirDocument(reservation.facture_url)}
                className="cursor-pointer bg-sky-700 text-white rounded-xl p-2"
              >
                Facture
              </button>
            </div>

            <div className="mt-4">
              {vuePermis === "archives" ? (
                <button
                  type="button"
                  disabled={Boolean(actionPermisEnCours)}
                  onClick={() => restaurerReservationPermis(reservation)}
                  className="w-full rounded-xl bg-sky-700 p-3 font-bold text-white disabled:bg-slate-300"
                >
                  {actionPermisEnCours === `restore:${reservation.id}`
                    ? "Restauration..."
                    : "Restaurer"}
                </button>
              ) : reservation.paiement_effectue === false ? (
                <button
                  type="button"
                  disabled={Boolean(actionPermisEnCours)}
                  onClick={() => supprimerReservationPermis(reservation)}
                  className="w-full rounded-xl bg-red-600 p-3 font-bold text-white disabled:bg-slate-300"
                >
                  {actionPermisEnCours === `delete:${reservation.id}`
                    ? "Suppression..."
                    : "Supprimer"}
                </button>
              ) : reservation.paiement_effectue === true &&
                reservation.statut === "Permis obtenu" ? (
                <button
                  type="button"
                  disabled={Boolean(actionPermisEnCours)}
                  onClick={() => archiverReservationPermis(reservation)}
                  className="w-full rounded-xl bg-slate-700 p-3 font-bold text-white disabled:bg-slate-300"
                >
                  {actionPermisEnCours === `archive:${reservation.id}`
                    ? "Archivage..."
                    : "Archiver"}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden lg:block overflow-x-auto bg-white rounded-xl shadow">
        <table className="min-w-[1600px] w-full text-sm">
          <thead className="bg-sky-800 text-white">
            <tr>
              <th className="p-3 text-left">Nom</th>
              <th className="p-3 text-left">Participant 2</th>
              <th className="p-3 text-left">Téléphone</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Formule</th>
              <th className="p-3 text-left">Tarif</th>
              <th className="p-3 text-left">Examen</th>
              <th className="p-3 text-left">Cours</th>
              <th className="p-3 text-left">Créneau</th>
              <th className="p-3 text-left">Paiement</th>
              <th className="p-3 text-left">Origine / mode</th>
              <th className="p-3 text-left">Facture</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Statut</th>
              <th className="p-3 text-left">Documents</th>
              <th className="p-3 text-left">Actions</th>
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
                <td className="p-3">
                  <div>{formatPricingType(reservation.pricing_type)}</div>
                  <div className="text-xs text-slate-500">
                    {formatXpf(reservation.pricing_amount)}
                  </div>
                </td>
                <td className="p-3">{reservation.examen}</td>
                <td className="p-3">{reservation.date_cours || "-"}</td>
                <td className="p-3">{reservation.creneau || "-"}</td>
                <td className="p-3">
                  {reservation.paiement_effectue ? "Payé" : "Non payé"}
                </td>
                <td className="p-3">
                  <div>{reservation.origine_reservation === "salon_admin" ? "Salon" : "Site"}</div>
                  <div className="text-xs text-slate-500">{formatPermisPaymentMode(reservation.mode_paiement)}</div>
                  {reservation.reference_paiement && <div className="text-xs text-slate-500">Réf. {reservation.reference_paiement}</div>}
                </td>
                <td className="p-3">
                  {reservation.facture_url ? (
                    <button
                      onClick={() => ouvrirDocument(reservation.facture_url)}
                      className="cursor-pointer bg-sky-700 text-white px-3 py-1 rounded"
                    >
                      {reservation.facture_numero || "Facture"}
                    </button>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-3">
                  <div>{reservation.email_sent ? "envoyé" : "non envoyé"}</div>
                  <div className="text-xs text-slate-500">
                    {formatDateTime(reservation.email_sent_at)}
                  </div>
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
                <td className="p-3">
                  {vuePermis === "archives" ? (
                    <button
                      type="button"
                      disabled={Boolean(actionPermisEnCours)}
                      onClick={() => restaurerReservationPermis(reservation)}
                      className="rounded bg-sky-700 px-3 py-1 font-bold text-white disabled:bg-slate-300"
                    >
                      {actionPermisEnCours === `restore:${reservation.id}`
                        ? "Restauration..."
                        : "Restaurer"}
                    </button>
                  ) : reservation.paiement_effectue === false ? (
                    <button
                      type="button"
                      disabled={Boolean(actionPermisEnCours)}
                      onClick={() => supprimerReservationPermis(reservation)}
                      className="rounded bg-red-600 px-3 py-1 font-bold text-white disabled:bg-slate-300"
                    >
                      {actionPermisEnCours === `delete:${reservation.id}`
                        ? "Suppression..."
                        : "Supprimer"}
                    </button>
                  ) : reservation.paiement_effectue === true &&
                    reservation.statut === "Permis obtenu" ? (
                    <button
                      type="button"
                      disabled={Boolean(actionPermisEnCours)}
                      onClick={() => archiverReservationPermis(reservation)}
                      className="rounded bg-slate-700 px-3 py-1 font-bold text-white disabled:bg-slate-300"
                    >
                      {actionPermisEnCours === `archive:${reservation.id}`
                        ? "Archivage..."
                        : "Archiver"}
                    </button>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section id="reservations-peche" className="mt-10 scroll-mt-6">
        <h2 className="mb-4 text-2xl font-bold">Reservations Peche</h2>

        {erreurAnnulation && (
          <p className="mb-4 rounded-xl bg-red-50 p-3 font-bold text-red-700">
            {erreurAnnulation}
          </p>
        )}

        <section className="mb-6 rounded-xl bg-white p-4 shadow md:p-6">
          <h3 className="text-xl font-bold">
            Ajouter reservation Peche manuelle
          </h3>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Paiement externe / a facturer. Aucun PayZen, email ou facture
            automatique ne sera lance.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm font-bold">
              Date sortie
              <input
                type="date"
                value={reservationPecheManuelle.dateSortie}
                onChange={(event) =>
                  modifierReservationPecheManuelle(
                    "dateSortie",
                    event.target.value
                  )
                }
                className="rounded-xl border p-3 font-normal"
              />
            </label>

            <label className="grid gap-1 text-sm font-bold">
              Formule
              <select
                value={reservationPecheManuelle.formule}
                onChange={(event) =>
                  modifierReservationPecheManuelle(
                    "formule",
                    event.target.value
                  )
                }
                className="cursor-pointer rounded-xl border p-3 font-normal"
              >
                {PECHE_FORMULAS.map((formula) => (
                  <option key={formula.id} value={formula.id}>
                    {pecheFormulaLabels[formula.id]}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-bold">
              Nom / origine
              <input
                value={reservationPecheManuelle.origine}
                onChange={(event) =>
                  modifierReservationPecheManuelle("origine", event.target.value)
                }
                placeholder="Hotel, conciergerie, telephone, WhatsApp..."
                className="rounded-xl border p-3 font-normal"
              />
            </label>

            <label className="grid gap-1 text-sm font-bold">
              Responsable prenom
              <input
                value={reservationPecheManuelle.responsablePrenom}
                onChange={(event) =>
                  modifierReservationPecheManuelle(
                    "responsablePrenom",
                    event.target.value
                  )
                }
                className="rounded-xl border p-3 font-normal"
              />
            </label>

            <label className="grid gap-1 text-sm font-bold">
              Responsable nom
              <input
                value={reservationPecheManuelle.responsableNom}
                onChange={(event) =>
                  modifierReservationPecheManuelle(
                    "responsableNom",
                    event.target.value
                  )
                }
                className="rounded-xl border p-3 font-normal"
              />
            </label>

            <label className="grid gap-1 text-sm font-bold">
              Telephone
              <input
                value={reservationPecheManuelle.telephone}
                onChange={(event) =>
                  modifierReservationPecheManuelle(
                    "telephone",
                    event.target.value
                  )
                }
                className="rounded-xl border p-3 font-normal"
              />
            </label>

            <label className="grid gap-1 text-sm font-bold">
              Email optionnel
              <input
                type="email"
                value={reservationPecheManuelle.email}
                onChange={(event) =>
                  modifierReservationPecheManuelle("email", event.target.value)
                }
                className="rounded-xl border p-3 font-normal"
              />
            </label>

            <label className="grid gap-1 text-sm font-bold">
              Nombre participants
              <input
                type="number"
                min="1"
                max="4"
                value={reservationPecheManuelle.nombreParticipants}
                onChange={(event) =>
                  modifierReservationPecheManuelle(
                    "nombreParticipants",
                    event.target.value
                  )
                }
                className="rounded-xl border p-3 font-normal"
              />
            </label>
          </div>

          <label className="mt-3 grid gap-1 text-sm font-bold">
            Commentaire
            <textarea
              value={reservationPecheManuelle.commentaire}
              onChange={(event) =>
                modifierReservationPecheManuelle(
                  "commentaire",
                  event.target.value
                )
              }
              rows={3}
              className="rounded-xl border p-3 font-normal"
            />
          </label>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            <button
              onClick={ajouterReservationPecheManuelle}
              disabled={creationPecheEnCours}
              className="cursor-pointer rounded-xl bg-cyan-800 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creationPecheEnCours
                ? "Creation en cours..."
                : "Ajouter la reservation"}
            </button>

            <p className="text-sm font-bold text-slate-600">
              Statut paiement : paiement externe / a facturer
            </p>
          </div>

          {erreurPecheManuel && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 font-bold text-red-700">
              {erreurPecheManuel}
            </p>
          )}

          {messagePecheManuel && (
            <p className="mt-4 rounded-xl bg-emerald-50 p-3 font-bold text-emerald-700">
              {messagePecheManuel}
            </p>
          )}
        </section>

        <div className="overflow-x-auto rounded-xl bg-white shadow">
          <table className="min-w-[1300px] w-full text-sm">
            <thead className="bg-cyan-800 text-white">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Formule</th>
                <th className="p-3 text-left">Origine</th>
                <th className="p-3 text-left">Client</th>
                <th className="p-3 text-left">Telephone</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Participants</th>
                <th className="p-3 text-left">Montant</th>
                <th className="p-3 text-left">Statut paiement</th>
                <th className="p-3 text-left">Commentaire</th>
                <th className="p-3 text-left">Facture</th>
                <th className="p-3 text-left">Email envoye</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {reservationsPeche.map((reservation) => (
                <tr key={reservation.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">{reservation.date_sortie || "-"}</td>
                  <td className="p-3">{formatPecheFormula(reservation.formule)}</td>
                  <td className="p-3">{reservation.origine || "-"}</td>
                  <td className="p-3">
                    {reservation.responsable_prenom}{" "}
                    {reservation.responsable_nom}
                  </td>
                  <td className="p-3">
                    {reservation.responsable_telephone || "-"}
                  </td>
                  <td className="p-3">{reservation.responsable_email || "-"}</td>
                  <td className="p-3">
                    {reservation.nombre_personnes || "-"}
                  </td>
                  <td className="p-3">{formatXpf(reservation.montant_paye)}</td>
                  <td className="p-3">
                    {formatPechePayment(
                      reservation.statut_paiement,
                      reservation.type_paiement
                    )}
                  </td>
                  <td className="p-3">{reservation.commentaire || "-"}</td>
                  <td className="p-3">
                    {reservation.facture_url ? (
                      <button
                        onClick={() => ouvrirDocument(reservation.facture_url)}
                        className="cursor-pointer rounded bg-sky-700 px-3 py-1 text-white"
                      >
                        {reservation.facture_numero || "Facture"}
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-3">
                    <div>
                      {reservation.email_sent ? "envoye" : "non envoye"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDateTime(reservation.email_sent_at)}
                    </div>
                  </td>
                  <td className="p-3">
                    {canCancelPecheReservation(reservation) ? (
                      <button
                        onClick={() =>
                          annulerReservationBateau(
                            "reservations_peche",
                            reservation.id
                          )
                        }
                        disabled={
                          annulationEnCours ===
                          `reservations_peche:${reservation.id}`
                        }
                        className="cursor-pointer rounded bg-red-700 px-3 py-1 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {annulationEnCours ===
                        `reservations_peche:${reservation.id}`
                          ? "Annulation..."
                          : "Annuler"}
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}

              {reservationsPeche.length === 0 && (
                <tr>
                  <td className="p-4 text-slate-500" colSpan={13}>
                    Aucune reservation peche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id="reservations-baleines" className="mt-10 scroll-mt-6">
        <h2 className="mb-4 text-2xl font-bold">Reservations Baleines</h2>

        <section className="mb-6 rounded-xl bg-white p-4 shadow md:p-6">
          <h3 className="text-xl font-bold">
            Ajouter reservation Baleines manuelle
          </h3>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Paiement externe / a facturer. Aucun PayZen, email ou facture
            automatique ne sera lance.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm font-bold">
              Date sortie
              <input
                type="date"
                value={reservationBaleinesManuelle.dateSortie}
                onChange={(event) =>
                  modifierReservationBaleinesManuelle(
                    "dateSortie",
                    event.target.value
                  )
                }
                className="rounded-xl border p-3 font-normal"
              />
            </label>

            <label className="grid gap-1 text-sm font-bold">
              Depart
              <select
                value={reservationBaleinesManuelle.depart}
                onChange={(event) =>
                  modifierReservationBaleinesManuelle(
                    "depart",
                    event.target.value
                  )
                }
                className="cursor-pointer rounded-xl border p-3 font-normal"
              >
                <option value="07:00">07:00</option>
                <option value="13:15">13:15</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm font-bold">
              Nom / origine
              <input
                value={reservationBaleinesManuelle.origine}
                onChange={(event) =>
                  modifierReservationBaleinesManuelle(
                    "origine",
                    event.target.value
                  )
                }
                placeholder="Hotel, conciergerie, WhatsApp..."
                className="rounded-xl border p-3 font-normal"
              />
            </label>

            <label className="grid gap-1 text-sm font-bold">
              Responsable prenom
              <input
                value={reservationBaleinesManuelle.responsablePrenom}
                onChange={(event) =>
                  modifierReservationBaleinesManuelle(
                    "responsablePrenom",
                    event.target.value
                  )
                }
                className="rounded-xl border p-3 font-normal"
              />
            </label>

            <label className="grid gap-1 text-sm font-bold">
              Responsable nom
              <input
                value={reservationBaleinesManuelle.responsableNom}
                onChange={(event) =>
                  modifierReservationBaleinesManuelle(
                    "responsableNom",
                    event.target.value
                  )
                }
                className="rounded-xl border p-3 font-normal"
              />
            </label>

            <label className="grid gap-1 text-sm font-bold">
              Telephone
              <input
                value={reservationBaleinesManuelle.telephone}
                onChange={(event) =>
                  modifierReservationBaleinesManuelle(
                    "telephone",
                    event.target.value
                  )
                }
                className="rounded-xl border p-3 font-normal"
              />
            </label>

            <label className="grid gap-1 text-sm font-bold">
              Email optionnel
              <input
                type="email"
                value={reservationBaleinesManuelle.email}
                onChange={(event) =>
                  modifierReservationBaleinesManuelle("email", event.target.value)
                }
                className="rounded-xl border p-3 font-normal"
              />
            </label>

            <label className="grid gap-1 text-sm font-bold">
              Nombre mise a l&apos;eau
              <input
                type="number"
                min="0"
                max={MAX_MISE_EAU}
                value={reservationBaleinesManuelle.nombreMiseEau}
                onChange={(event) =>
                  modifierReservationBaleinesManuelle(
                    "nombreMiseEau",
                    event.target.value
                  )
                }
                className="rounded-xl border p-3 font-normal"
              />
            </label>

            <label className="grid gap-1 text-sm font-bold">
              Nombre observateurs
              <input
                type="number"
                min="0"
                max={MAX_OBSERVATEURS}
                value={reservationBaleinesManuelle.nombreObservateurs}
                onChange={(event) =>
                  modifierReservationBaleinesManuelle(
                    "nombreObservateurs",
                    event.target.value
                  )
                }
                className="rounded-xl border p-3 font-normal"
              />
            </label>
          </div>

          <label className="mt-3 grid gap-1 text-sm font-bold">
            Commentaire
            <textarea
              value={reservationBaleinesManuelle.commentaire}
              onChange={(event) =>
                modifierReservationBaleinesManuelle(
                  "commentaire",
                  event.target.value
                )
              }
              rows={3}
              className="rounded-xl border p-3 font-normal"
            />
          </label>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            <button
              onClick={ajouterReservationBaleinesManuelle}
              disabled={creationBaleinesEnCours}
              className="cursor-pointer rounded-xl bg-cyan-800 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creationBaleinesEnCours
                ? "Creation en cours..."
                : "Ajouter la reservation"}
            </button>

            <p className="text-sm font-bold text-slate-600">
              Statut paiement : paiement externe / a facturer
            </p>
          </div>

          {erreurBaleinesManuel && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 font-bold text-red-700">
              {erreurBaleinesManuel}
            </p>
          )}

          {messageBaleinesManuel && (
            <p className="mt-4 rounded-xl bg-emerald-50 p-3 font-bold text-emerald-700">
              {messageBaleinesManuel}
            </p>
          )}
        </section>

        <div className="overflow-x-auto rounded-xl bg-white shadow">
          <table className="min-w-[1400px] w-full text-sm">
            <thead className="bg-cyan-800 text-white">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Depart</th>
                <th className="p-3 text-left">Origine</th>
                <th className="p-3 text-left">Responsable</th>
                <th className="p-3 text-left">Telephone</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Participants</th>
                <th className="p-3 text-left">Detail</th>
                <th className="p-3 text-left">Montant</th>
                <th className="p-3 text-left">Statut paiement</th>
                <th className="p-3 text-left">Commentaire</th>
                <th className="p-3 text-left">Facture</th>
                <th className="p-3 text-left">Email envoye</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {reservationsBaleines.map((reservation) => (
                <tr key={reservation.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">{reservation.date_sortie || "-"}</td>
                  <td className="p-3">{reservation.depart || "-"}</td>
                  <td className="p-3">
                    {getBaleinesManualOrigin(reservation.participants) || "-"}
                  </td>
                  <td className="p-3">
                    {reservation.responsable_prenom}{" "}
                    {reservation.responsable_nom}
                  </td>
                  <td className="p-3">
                    {reservation.responsable_telephone || "-"}
                  </td>
                  <td className="p-3">{reservation.responsable_email || "-"}</td>
                  <td className="p-3">
                    <div>{countParticipants(reservation.participants)}</div>
                    <button
                      type="button"
                      onClick={() => setReservationBaleinesDetail(reservation)}
                      className="mt-2 cursor-pointer whitespace-nowrap rounded-lg bg-cyan-700 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-cyan-800"
                    >
                      Voir détails
                    </button>
                  </td>
                  <td className="p-3">
                    {countBaleinesRole(reservation.participants, "mise_eau")} ME
                    /{" "}
                    {countBaleinesRole(reservation.participants, "observateur")}{" "}
                    obs.
                  </td>
                  <td className="p-3">{formatXpf(reservation.montant_total)}</td>
                  <td className="p-3">
                    {reservation.source_paiement ===
                    "paiement_externe_a_facturer"
                      ? "paiement externe / a facturer"
                      : reservation.statut_paiement || "-"}
                  </td>
                  <td className="p-3">
                    {getBaleinesManualComment(reservation.participants) || "-"}
                  </td>
                  <td className="p-3">
                    {reservation.facture_url ? (
                      <button
                        onClick={() => ouvrirDocument(reservation.facture_url)}
                        className="cursor-pointer rounded bg-sky-700 px-3 py-1 text-white"
                      >
                        {reservation.facture_numero || "Facture"}
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-3">
                    <div>
                      {reservation.email_sent ? "envoye" : "non envoye"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDateTime(reservation.email_sent_at)}
                    </div>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => supprimerReservationBaleines(reservation)}
                      disabled={suppressionBaleinesEnCours === reservation.id}
                      className="cursor-pointer rounded bg-red-700 px-3 py-1 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {suppressionBaleinesEnCours === reservation.id
                        ? "Suppression..."
                        : "Supprimer"}
                    </button>
                  </td>
                </tr>
              ))}

              {reservationsBaleines.length === 0 && (
                <tr>
                  <td className="p-4 text-slate-500" colSpan={14}>
                    Aucune reservation baleines.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {reservationBaleinesDetail && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setReservationBaleinesDetail(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="baleines-detail-title"
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-slate-100 shadow-2xl sm:max-w-4xl sm:rounded-3xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
                  Réservation Baleines
                </p>
                <h2
                  id="baleines-detail-title"
                  className="mt-1 text-xl font-black text-slate-950 sm:text-2xl"
                >
                  Détail des participants
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setReservationBaleinesDetail(null)}
                className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 font-bold text-white hover:bg-slate-700"
              >
                Fermer
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <dl className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem
                  label="Date"
                  value={reservationBaleinesDetail.date_sortie}
                />
                <DetailItem
                  label="Départ"
                  value={reservationBaleinesDetail.depart}
                />
                <DetailItem
                  label="Responsable"
                  value={`${reservationBaleinesDetail.responsable_prenom || ""} ${
                    reservationBaleinesDetail.responsable_nom || ""
                  }`.trim()}
                />
                <DetailItem
                  label="Téléphone"
                  value={reservationBaleinesDetail.responsable_telephone}
                />
                <DetailItem
                  label="Email"
                  value={reservationBaleinesDetail.responsable_email}
                />
                <DetailItem
                  label="Statut paiement"
                  value={reservationBaleinesDetail.statut_paiement}
                />
                <DetailItem
                  label="Montant"
                  value={formatXpf(reservationBaleinesDetail.montant_total)}
                />
              </dl>

              <div className="mt-5 space-y-4">
                {(reservationBaleinesDetail.participants || []).map(
                  (participant, index) => {
                    const prenom = participant.prenom?.trim() || "";
                    const nom = participant.nom?.trim() || "";
                    const taille = participant.tailleCombinaison?.trim();
                    const pointure = participant.pointurePalmes?.trim();
                    const materielPersonnel =
                      participant.materielPerso === true;

                    return (
                      <article
                        key={`${prenom}-${nom}-${index}`}
                        className="rounded-2xl bg-white p-4 shadow-sm sm:p-5"
                      >
                        <div className="flex flex-col gap-1 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
                          <h3 className="font-black text-slate-950">
                            Participant {index + 1}
                          </h3>
                          <p className="text-lg font-bold text-cyan-900">
                            {`${prenom} ${nom}`.trim() || "Nom non renseigné"}
                          </p>
                        </div>

                        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                          <DetailItem
                            label="Âge"
                            value={participant.age?.trim()}
                          />
                          <DetailItem
                            label="Rôle"
                            value={
                              participant.role === "mise_eau"
                                ? "Mise à l’eau"
                                : participant.role === "observateur"
                                  ? "Observateur"
                                  : participant.role
                            }
                          />
                          <DetailItem
                            label="Matériel personnel"
                            value={materielPersonnel ? "Oui" : "Non"}
                            highlight={materielPersonnel}
                          />
                          {taille && (
                            <DetailItem
                              label="Taille combinaison"
                              value={taille}
                            />
                          )}
                          {pointure && (
                            <DetailItem
                              label="Pointure palmes"
                              value={pointure}
                            />
                          )}
                        </dl>
                      </article>
                    );
                  }
                )}

                {!reservationBaleinesDetail.participants?.length && (
                  <p className="rounded-2xl bg-white p-5 text-slate-500 shadow-sm">
                    Aucun participant enregistré.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function canDeleteBaleinesReservation(reservation: AdminBaleinesReservation) {
  const status = String(reservation.statut_paiement || "").toLowerCase();
  return (
    reservation.paye !== true &&
    status !== "paid" &&
    status !== "paye"
  );
}

function DetailItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | null | undefined;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-1 break-words font-bold ${
          highlight ? "text-cyan-700" : "text-slate-950"
        }`}
      >
        {value?.trim() || "-"}
      </dd>
    </div>
  );
}

function DashboardCard({
  icon,
  title,
  primary,
  secondary,
}: {
  icon: string;
  title: string;
  primary: string;
  secondary: string;
}) {
  return (
    <article className="rounded-3xl bg-white p-5 text-slate-950 shadow-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
            {title}
          </p>
          <p className="mt-3 text-3xl font-black">{primary}</p>
          <p className="mt-1 text-sm font-bold text-slate-500">{secondary}</p>
        </div>
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-50 text-3xl">
          {icon}
        </span>
      </div>
    </article>
  );
}

function AdminModuleCard({
  description,
  href,
  icon,
  title,
}: {
  description: string;
  href: string;
  icon: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-52 flex-col rounded-3xl border border-cyan-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-800"
    >
      <span
        className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 text-2xl"
        aria-hidden="true"
      >
        {icon}
      </span>
      <h2 className="mt-5 text-xl font-black text-cyan-950">{title}</h2>
      <p className="mt-2 flex-1 text-sm font-semibold leading-6 text-slate-600">
        {description}
      </p>
      <span className="mt-5 inline-flex min-h-11 items-center justify-center self-start rounded-xl bg-cyan-900 px-5 text-sm font-black text-white transition group-hover:bg-cyan-700">
        Ouvrir
      </span>
    </Link>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-white/95 p-4 text-slate-950">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-700">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}
