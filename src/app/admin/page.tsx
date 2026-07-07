"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getPermisPricing } from "@/lib/permisPricing";

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
  responsable_prenom: string | null;
  responsable_nom: string | null;
  responsable_telephone: string | null;
  responsable_email: string | null;
  nombre_personnes: number | null;
  montant_paye: number | null;
  statut_paiement: string | null;
  facture_numero: string | null;
  facture_url: string | null;
  email_sent: boolean | null;
  email_sent_at: string | null;
};

type BaleinesParticipant = {
  prenom?: string | null;
  nom?: string | null;
  role?: string | null;
  type?: string | null;
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
  facture_numero: string | null;
  facture_url: string | null;
  email_sent: boolean | null;
  email_sent_at: string | null;
};

const pricingTypeLabels: Record<string, string> = {
  normal: "Tarif normal",
  promo_internet: "Promo Internet",
  salon_tourisme: "Salon du Tourisme",
};

function formatPricingType(value: string | null) {
  return pricingTypeLabels[value || "normal"] || pricingTypeLabels.normal;
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
  const [filtreStatut, setFiltreStatut] = useState("Tous");
  const [motDePasse, setMotDePasse] = useState("");
  const [accesAutorise, setAccesAutorise] = useState(false);

  const [dateExamenBloquee, setDateExamenBloquee] = useState("");
  const [motifBlocage, setMotifBlocage] = useState("");
  const [examensBloques, setExamensBloques] = useState<ExamenBloque[]>([]);

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
    const { data, error } = await supabase
      .from("reservations_peche")
      .select(
        "id,date_sortie,formule,responsable_prenom,responsable_nom,responsable_telephone,responsable_email,nombre_personnes,montant_paye,statut_paiement,facture_numero,facture_url,email_sent,email_sent_at"
      )
      .order("date_sortie", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setReservationsPeche((data || []) as AdminPecheReservation[]);
  }

  async function chargerReservationsBaleines() {
    const { data, error } = await supabase
      .from("reservations_baleines")
      .select(
        "id,date_sortie,depart,responsable_prenom,responsable_nom,responsable_telephone,responsable_email,participants,montant_total,statut_paiement,facture_numero,facture_url,email_sent,email_sent_at"
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
      <section className="mb-10 overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-white shadow-2xl md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-300">
              Tahiti Trip Fishing
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">
              Tableau de bord
            </h1>
          </div>
          <p className="text-sm font-semibold text-slate-300">
            Aujourd&apos;hui : {todayKey.split("-").reverse().join("/")}
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
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
          <section className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/10">
            <h2 className="text-lg font-black">Cette semaine</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <MiniMetric label="Pêche" value={pecheWeek.length} />
              <MiniMetric label="Baleines" value={baleinesWeek.length} />
              <MiniMetric label="Permis" value={permisWeek.length} />
            </div>
          </section>

          <section className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/10">
            <h2 className="text-lg font-black">Ce mois</h2>
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

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <section className="rounded-3xl bg-white p-5 text-slate-950">
            <h2 className="text-lg font-black">Alertes</h2>
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

          <section className="rounded-3xl bg-white p-5 text-slate-950">
            <h2 className="text-lg font-black">Raccourcis</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ShortcutButton href="/admin/bateau" label="Calendrier bateau" />
              <ShortcutButton
                href="#reservations-permis"
                label="Réservations Permis"
              />
              <ShortcutButton
                href="#reservations-peche"
                label="Réservations Pêche"
              />
              <ShortcutButton
                href="#reservations-baleines"
                label="Réservations Baleines"
              />
            </div>
          </section>
        </div>
      </section>
      <h1
        id="reservations-permis"
        className="text-3xl md:text-4xl font-bold mb-6 scroll-mt-6"
      >
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
              <th className="p-3 text-left">Tarif</th>
              <th className="p-3 text-left">Examen</th>
              <th className="p-3 text-left">Cours</th>
              <th className="p-3 text-left">Créneau</th>
              <th className="p-3 text-left">Paiement</th>
              <th className="p-3 text-left">Facture</th>
              <th className="p-3 text-left">Email</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section id="reservations-peche" className="mt-10 scroll-mt-6">
        <h2 className="mb-4 text-2xl font-bold">Reservations Peche</h2>

        <div className="overflow-x-auto rounded-xl bg-white shadow">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-cyan-800 text-white">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Formule</th>
                <th className="p-3 text-left">Client</th>
                <th className="p-3 text-left">Telephone</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Montant</th>
                <th className="p-3 text-left">Statut paiement</th>
                <th className="p-3 text-left">Facture</th>
                <th className="p-3 text-left">Email envoye</th>
              </tr>
            </thead>

            <tbody>
              {reservationsPeche.map((reservation) => (
                <tr key={reservation.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">{reservation.date_sortie || "-"}</td>
                  <td className="p-3">{reservation.formule || "-"}</td>
                  <td className="p-3">
                    {reservation.responsable_prenom}{" "}
                    {reservation.responsable_nom}
                  </td>
                  <td className="p-3">
                    {reservation.responsable_telephone || "-"}
                  </td>
                  <td className="p-3">{reservation.responsable_email || "-"}</td>
                  <td className="p-3">{formatXpf(reservation.montant_paye)}</td>
                  <td className="p-3">{reservation.statut_paiement || "-"}</td>
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
                </tr>
              ))}

              {reservationsPeche.length === 0 && (
                <tr>
                  <td className="p-4 text-slate-500" colSpan={9}>
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

        <div className="overflow-x-auto rounded-xl bg-white shadow">
          <table className="min-w-[1200px] w-full text-sm">
            <thead className="bg-cyan-800 text-white">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Depart</th>
                <th className="p-3 text-left">Responsable</th>
                <th className="p-3 text-left">Telephone</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Participants</th>
                <th className="p-3 text-left">Montant</th>
                <th className="p-3 text-left">Statut paiement</th>
                <th className="p-3 text-left">Facture</th>
                <th className="p-3 text-left">Email envoye</th>
              </tr>
            </thead>

            <tbody>
              {reservationsBaleines.map((reservation) => (
                <tr key={reservation.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">{reservation.date_sortie || "-"}</td>
                  <td className="p-3">{reservation.depart || "-"}</td>
                  <td className="p-3">
                    {reservation.responsable_prenom}{" "}
                    {reservation.responsable_nom}
                  </td>
                  <td className="p-3">
                    {reservation.responsable_telephone || "-"}
                  </td>
                  <td className="p-3">{reservation.responsable_email || "-"}</td>
                  <td className="p-3">
                    {countParticipants(reservation.participants)}
                  </td>
                  <td className="p-3">{formatXpf(reservation.montant_total)}</td>
                  <td className="p-3">{reservation.statut_paiement || "-"}</td>
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
                </tr>
              ))}

              {reservationsBaleines.length === 0 && (
                <tr>
                  <td className="p-4 text-slate-500" colSpan={10}>
                    Aucune reservation baleines.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
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

function ShortcutButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-cyan-800"
    >
      {label}
    </a>
  );
}
