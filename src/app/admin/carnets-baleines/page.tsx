"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useAdminSession } from "@/hooks/useAdminSession";
import {
  DATE_EXPIRATION_CARNETS_BALEINES_MANUEL,
  getModePaiementCarnetLabel,
  MODES_PAIEMENT_CARNET_MANUEL,
  OFFRES_CARNETS_BALEINES,
} from "@/lib/carnetsBaleines";

type StatutAffiche =
  | "actif"
  | "bientot_expire"
  | "en_attente"
  | "expire"
  | "annule";
type Filtre = "tous" | "actif" | "en_attente" | "expire" | "annule";

type UtilisationCarnet = {
  date_utilisation: string | null;
  date_sortie: string | null;
  depart: string | null;
  credits_consommes: number;
  reservation_id: string | null;
};

type CarnetAdmin = {
  id: string;
  code: string;
  prenom_acheteur: string;
  nom_acheteur: string;
  telephone: string | null;
  email: string;
  type_carnet: number;
  credits_initiaux: number;
  credits_restants: number;
  prix: number;
  created_at: string;
  paid_at: string | null;
  date_expiration: string;
  statut: string;
  paiement_effectue: boolean;
  facture_numero: string | null;
  facture_url: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  mode_paiement: string | null;
  reference_paiement: string | null;
  montant_encaisse: number | null;
  origine_creation: string | null;
  commentaire_interne: string | null;
  facture_remise: boolean;
  historique: UtilisationCarnet[];
};

const FILTRES: Array<{ value: Filtre; label: string }> = [
  { value: "tous", label: "Tous" },
  { value: "actif", label: "Actifs" },
  { value: "en_attente", label: "En attente" },
  { value: "expire", label: "Expirés" },
  { value: "annule", label: "Annulés" },
];

function statutCarnet(carnet: CarnetAdmin): StatutAffiche {
  const statut = String(carnet.statut || "").toLowerCase();
  const partiesDate = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Pacific/Tahiti",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const annee = partiesDate.find((partie) => partie.type === "year")?.value;
  const mois = partiesDate.find((partie) => partie.type === "month")?.value;
  const jour = partiesDate.find((partie) => partie.type === "day")?.value;
  const dateAujourdhuiTahiti = `${annee}-${mois}-${jour}`;

  if (
    statut === "cancelled" ||
    statut === "annule" ||
    statut === "annulé"
  ) {
    return "annule";
  }
  if (
    statut === "expire" ||
    statut === "expiré" ||
    carnet.date_expiration < dateAujourdhuiTahiti
  ) {
    return "expire";
  }
  if (!carnet.paiement_effectue || statut === "en_attente") {
    return "en_attente";
  }

  const expiration = new Date(`${carnet.date_expiration}T00:00:00Z`);
  const aujourdHui = new Date(`${dateAujourdhuiTahiti}T00:00:00Z`);
  const joursAvantExpiration =
    (expiration.getTime() - aujourdHui.getTime()) / 86_400_000;

  if (joursAvantExpiration <= 30) return "bientot_expire";

  return "actif";
}

function statutLabel(statut: StatutAffiche) {
  if (statut === "actif") return "Actif";
  if (statut === "bientot_expire") return "Bientôt expiré";
  if (statut === "expire") return "Expiré";
  if (statut === "annule") return "Annulé";
  return "En attente";
}

function formatDate(value: string | null) {
  if (!value) return "—";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [annee, mois, jour] = value.split("-");
    return `${jour}/${mois}/${annee}`;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatPrix(value: number) {
  return `${Number(value || 0).toLocaleString("fr-FR")} F CFP`;
}

function origineLabel(value: string | null) {
  return value === "manuel" ? "Création manuelle" : "En ligne";
}

export default function AdminCarnetsBaleinesPage() {
  const [motDePasse, setMotDePasse] = useState("");
  const {
    authenticated: accesAutorise,
    checking: verificationSession,
    login: connecterAdmin,
    logout: deconnecterAdmin,
  } = useAdminSession();
  const [carnets, setCarnets] = useState<CarnetAdmin[]>([]);
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [selection, setSelection] = useState<CarnetAdmin | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [action, setAction] = useState("");
  const [message, setMessage] = useState("");
  const [creationOuverte, setCreationOuverte] = useState(false);

  const chargerCarnets = useCallback(async () => {
    setChargement(true);
    setErreur("");

    try {
      const response = await fetch("/api/admin/carnets-baleines");
      const payload = await response.json();

      if (!response.ok) {
        setErreur(payload.error || "Impossible de charger les carnets.");
        return;
      }

      setCarnets(Array.isArray(payload.carnets) ? payload.carnets : []);
    } catch {
      setErreur("Impossible de charger les carnets.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    if (!accesAutorise) return;
    void Promise.resolve().then(chargerCarnets);
  }, [accesAutorise, chargerCarnets]);

  const carnetsFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return carnets.filter((carnet) => {
      const statut = statutCarnet(carnet);
      const correspondFiltre =
        filtre === "tous" ||
        filtre === statut ||
        (filtre === "actif" && statut === "bientot_expire");
      const texte = [
        carnet.nom_acheteur,
        carnet.prenom_acheteur,
        carnet.telephone,
        carnet.email,
        carnet.code,
      ]
        .join(" ")
        .toLowerCase();

      return correspondFiltre && (!terme || texte.includes(terme));
    });
  }, [carnets, filtre, recherche]);

  const statistiques = useMemo(() => {
    const actifs = carnets.filter((carnet) => {
      const statut = statutCarnet(carnet);
      return statut === "actif" || statut === "bientot_expire";
    });

    return {
      actifs: actifs.length,
      credits: actifs.reduce(
        (total, carnet) => total + Number(carnet.credits_restants || 0),
        0
      ),
      expires: carnets.filter(
        (carnet) => statutCarnet(carnet) === "expire"
      ).length,
      chiffreAffaires: carnets
        .filter((carnet) => carnet.paiement_effectue)
        .reduce(
          (total, carnet) =>
            total + Number(carnet.montant_encaisse ?? carnet.prix ?? 0),
          0
        ),
    };
  }, [carnets]);

  async function copier(value: string, confirmation: string) {
    await navigator.clipboard.writeText(value);
    setMessage(confirmation);
  }

  async function telechargerFacture(carnet: CarnetAdmin) {
    setAction("facture");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/carnets-baleines/facture?id=${encodeURIComponent(
          carnet.id
        )}`
      );
      const payload = await response.json();

      if (!response.ok || !payload.url) {
        setMessage(payload.error || "Facture indisponible.");
        return;
      }

      window.open(payload.url, "_blank", "noopener,noreferrer");
    } catch {
      setMessage("Facture indisponible.");
    } finally {
      setAction("");
    }
  }

  async function renvoyerCarnet(carnet: CarnetAdmin) {
    setAction("email");
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/carnets-baleines/renvoyer",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: carnet.id }),
        }
      );
      const payload = await response.json();

      setMessage(
        response.ok
          ? "Le carnet et sa facture ont été renvoyés."
          : payload.error || "Impossible de renvoyer le carnet."
      );
    } catch {
      setMessage("Impossible de renvoyer le carnet.");
    } finally {
      setAction("");
    }
  }

  async function annulerCarnet(carnet: CarnetAdmin) {
    if (
      !window.confirm(
        `Annuler le carnet ${carnet.code} ? Il ne pourra plus être utilisé pour une réservation.`
      )
    ) {
      return;
    }

    setAction("annulation");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/carnets-baleines/${encodeURIComponent(carnet.id)}`,
        { method: "PATCH" }
      );
      const payload = await response.json();

      if (!response.ok || !payload.carnet) {
        setMessage(payload.error || "Impossible d’annuler le carnet.");
        return;
      }

      const carnetAnnule = {
        ...carnet,
        ...payload.carnet,
        historique: carnet.historique,
      };
      setCarnets((actuels) =>
        actuels.map((item) =>
          item.id === carnetAnnule.id ? carnetAnnule : item
        )
      );
      setSelection(carnetAnnule);
      setMessage("Le carnet a été annulé. Ses données ont été conservées.");
    } catch {
      setMessage("Impossible d’annuler le carnet.");
    } finally {
      setAction("");
    }
  }

  async function supprimerCarnet(carnet: CarnetAdmin) {
    if (
      !window.confirm(
        `Supprimer définitivement le carnet ${carnet.code} et tout son historique ?`
      )
    ) {
      return;
    }

    if (
      !window.confirm(
        "Cette action est irréversible. Confirmez-vous la suppression définitive ?"
      )
    ) {
      return;
    }

    setAction("suppression");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/carnets-baleines/${encodeURIComponent(carnet.id)}`,
        { method: "DELETE" }
      );
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error || "Impossible de supprimer le carnet.");
        return;
      }

      setCarnets((actuels) =>
        actuels.filter((item) => item.id !== carnet.id)
      );
      setSelection(null);
      setMessage("");
      window.alert("Le carnet et son historique ont été supprimés définitivement.");
    } catch {
      setMessage("Impossible de supprimer le carnet.");
    } finally {
      setAction("");
    }
  }

  if (verificationSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cyan-50 p-4">
        <p className="font-bold text-cyan-900">Vérification de la session…</p>
      </main>
    );
  }

  if (!accesAutorise) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cyan-50 p-4">
        <section className="w-full max-w-md rounded-[28px] border border-cyan-100 bg-white p-6 shadow-xl">
          <p className="text-sm font-black uppercase tracking-widest text-cyan-700">
            Admin Carnets Baleines
          </p>
          <h1 className="mt-3 text-3xl font-black">Accès admin</h1>
          <input
            type="password"
            value={motDePasse}
            onChange={(event) => setMotDePasse(event.target.value)}
            placeholder="Mot de passe"
            className="mt-6 min-h-12 w-full rounded-xl border p-3"
          />
          <button
            type="button"
            onClick={async () => {
              const resultat = await connecterAdmin(motDePasse);
              if (!resultat.ok) setErreur(resultat.error);
            }}
            className="mt-4 min-h-12 w-full rounded-xl bg-cyan-900 font-black text-white"
          >
            Entrer
          </button>
          {erreur && (
            <p className="mt-3 text-sm font-bold text-red-700">{erreur}</p>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-950 sm:p-6">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-cyan-700">
              Administration
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Carnets Baleines
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void deconnecterAdmin()}
              className="rounded-full border border-cyan-200 bg-white px-4 py-2 text-sm font-black text-cyan-900"
            >
              Déconnexion
            </button>
            <button
              type="button"
              onClick={() => setCreationOuverte(true)}
              className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-200"
            >
              + Nouveau carnet
            </button>
            <Link
              href="/admin"
              className="rounded-full border border-cyan-200 bg-white px-4 py-2 text-sm font-black text-cyan-900"
            >
              Tableau de bord
            </Link>
            <Link
              href="/admin/bateau"
              className="rounded-full border border-cyan-200 bg-white px-4 py-2 text-sm font-black text-cyan-900"
            >
              Calendrier bateau
            </Link>
          </nav>
        </header>

        <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Carnets actifs" value={statistiques.actifs} />
          <StatCard label="Crédits restants" value={statistiques.credits} />
          <StatCard label="Carnets expirés" value={statistiques.expires} />
          <StatCard
            label="Chiffre d’affaires Carnets"
            value={formatPrix(statistiques.chiffreAffaires)}
          />
        </section>

        <section className="mt-7 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <input
              type="search"
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder="Rechercher un client, téléphone, e-mail ou code..."
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 lg:max-w-xl"
            />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTRES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFiltre(item.value)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-black ${
                    filtre === item.value
                      ? "bg-cyan-900 text-white"
                      : "bg-cyan-50 text-cyan-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {erreur && (
            <p className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700">
              {erreur}
            </p>
          )}

          <div className="mt-6 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1450px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                  {[
                    "Code carnet",
                    "Client",
                    "Téléphone",
                    "Email",
                    "Formule",
                    "Crédits restants",
                    "Origine",
                    "Paiement",
                    "Facture remise",
                    "Date d’achat",
                    "Expiration",
                    "Statut",
                    "Actions",
                  ].map((titre) => (
                    <th key={titre} className="px-3 py-4 font-black">
                      {titre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {carnetsFiltres.map((carnet) => (
                  <tr key={carnet.id} className="border-b last:border-0">
                    <td className="px-3 py-4 font-black text-cyan-900">
                      {carnet.code}
                    </td>
                    <td className="px-3 py-4 font-bold">
                      {carnet.prenom_acheteur} {carnet.nom_acheteur}
                    </td>
                    <td className="px-3 py-4">{carnet.telephone || "—"}</td>
                    <td className="px-3 py-4">{carnet.email}</td>
                    <td className="px-3 py-4">{carnet.type_carnet} sorties</td>
                    <td className="px-3 py-4 font-black">
                      {carnet.credits_restants} / {carnet.credits_initiaux}
                    </td>
                    <td className="px-3 py-4">
                      {origineLabel(carnet.origine_creation)}
                    </td>
                    <td className="px-3 py-4">
                      {getModePaiementCarnetLabel(carnet.mode_paiement)}
                    </td>
                    <td className="px-3 py-4 font-bold text-emerald-700">
                      {carnet.facture_remise ? "✓ Facture remise" : "—"}
                    </td>
                    <td className="px-3 py-4">
                      {formatDate(carnet.paid_at || carnet.created_at)}
                    </td>
                    <td className="px-3 py-4">
                      {formatDate(carnet.date_expiration)}
                    </td>
                    <td className="px-3 py-4">
                      <StatusBadge statut={statutCarnet(carnet)} />
                    </td>
                    <td className="px-3 py-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelection(carnet);
                          setMessage("");
                        }}
                        className="rounded-xl bg-cyan-900 px-4 py-2 font-black text-white"
                      >
                        Voir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-3 md:hidden">
            {carnetsFiltres.map((carnet) => (
              <article
                key={carnet.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black">
                      {carnet.prenom_acheteur} {carnet.nom_acheteur}
                    </p>
                    <p className="mt-1 break-all text-sm font-bold text-cyan-800">
                      {carnet.code}
                    </p>
                  </div>
                  <StatusBadge statut={statutCarnet(carnet)} />
                </div>
                <p className="mt-4 text-sm font-bold">
                  Crédits disponibles : {carnet.credits_restants} /{" "}
                  {carnet.credits_initiaux}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {origineLabel(carnet.origine_creation)} ·{" "}
                  {getModePaiementCarnetLabel(carnet.mode_paiement)}
                </p>
                {carnet.facture_remise && (
                  <p className="mt-1 text-sm font-bold text-emerald-700">
                    ✓ Facture remise
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelection(carnet);
                    setMessage("");
                  }}
                  className="mt-4 min-h-11 w-full rounded-xl bg-cyan-900 font-black text-white"
                >
                  Voir
                </button>
              </article>
            ))}
          </div>

          {!chargement && carnetsFiltres.length === 0 && (
            <p className="py-12 text-center font-bold text-slate-500">
              Aucun carnet ne correspond à la recherche.
            </p>
          )}
          {chargement && (
            <p className="py-12 text-center font-bold text-slate-500">
              Chargement des carnets...
            </p>
          )}
        </section>
      </div>

      {selection && (
        <CarnetDrawer
          carnet={selection}
          action={action}
          message={message}
          onClose={() => setSelection(null)}
          onCopy={copier}
          onDownload={telechargerFacture}
          onResend={renvoyerCarnet}
          onCancel={annulerCarnet}
          onDelete={supprimerCarnet}
        />
      )}
      {creationOuverte && (
        <NouveauCarnetDrawer
          onClose={() => setCreationOuverte(false)}
          onCreated={(carnet, warning) => {
            setCreationOuverte(false);
            setCarnets((actuels) => [
              carnet,
              ...actuels.filter((item) => item.id !== carnet.id),
            ]);
            setSelection(carnet);
            setMessage(
              warning ||
                "Carnet créé et activé. La facture est disponible immédiatement."
            );
            void chargerCarnets();
          }}
        />
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-black uppercase tracking-wide text-cyan-700">
        {label}
      </p>
      <p className="mt-3 text-2xl font-black sm:text-3xl">{value}</p>
    </article>
  );
}

function StatusBadge({ statut }: { statut: StatutAffiche }) {
  const styles = {
    actif: "bg-emerald-100 text-emerald-800",
    bientot_expire: "bg-orange-100 text-orange-900",
    en_attente: "bg-sky-100 text-sky-900",
    expire: "bg-red-100 text-red-800",
    annule: "bg-slate-700 text-white",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${styles[statut]}`}
    >
      {statutLabel(statut)}
    </span>
  );
}

function CarnetDrawer({
  action,
  carnet,
  message,
  onClose,
  onCopy,
  onDownload,
  onResend,
  onCancel,
  onDelete,
}: {
  action: string;
  carnet: CarnetAdmin;
  message: string;
  onClose: () => void;
  onCopy: (value: string, confirmation: string) => void;
  onDownload: (carnet: CarnetAdmin) => void;
  onResend: (carnet: CarnetAdmin) => void;
  onCancel: (carnet: CarnetAdmin) => void;
  onDelete: (carnet: CarnetAdmin) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40" onClick={onClose}>
      <aside
        className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan-700">
              Détail carnet
            </p>
            <h2 className="mt-2 text-2xl font-black">{carnet.code}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border px-4 py-2 font-black"
          >
            Fermer
          </button>
        </div>

        <DetailSection title="Informations client">
          <Detail label="Prénom" value={carnet.prenom_acheteur} />
          <Detail label="Nom" value={carnet.nom_acheteur} />
          <Detail label="Téléphone" value={carnet.telephone || "—"} />
          <Detail label="E-mail" value={carnet.email} />
        </DetailSection>

        <DetailSection title="Informations carnet">
          <Detail label="Code" value={carnet.code} />
          <Detail label="Formule" value={`${carnet.type_carnet} sorties`} />
          <Detail label="Origine" value={origineLabel(carnet.origine_creation)} />
          <Detail
            label="Mode de paiement"
            value={getModePaiementCarnetLabel(carnet.mode_paiement)}
          />
          <Detail
            label="Montant encaissé"
            value={formatPrix(carnet.montant_encaisse ?? carnet.prix)}
          />
          <Detail
            label="Référence paiement"
            value={carnet.reference_paiement || "—"}
          />
          <Detail
            label="Facture remise"
            value={carnet.facture_remise ? "Oui" : "Non"}
          />
          <Detail
            label="Crédits initiaux"
            value={String(carnet.credits_initiaux)}
          />
          <Detail
            label="Crédits restants"
            value={String(carnet.credits_restants)}
          />
          <Detail
            label="Crédits disponibles"
            value={`${carnet.credits_restants} / ${carnet.credits_initiaux}`}
          />
          <Detail
            label="Date d’achat"
            value={formatDate(carnet.paid_at || carnet.created_at)}
          />
          <Detail
            label="Expiration"
            value={formatDate(carnet.date_expiration)}
          />
          <Detail label="Statut" value={statutLabel(statutCarnet(carnet))} />
        </DetailSection>

        <DetailSection title="Suivi interne">
          <Detail
            label="Commentaire interne"
            value={carnet.commentaire_interne || "—"}
          />
        </DetailSection>

        <section className="mt-7">
          <h3 className="text-lg font-black">Historique des utilisations</h3>
          <div className="mt-4 space-y-3">
            {carnet.historique.map((utilisation, index) => (
              <article
                key={`${utilisation.reservation_id || "sans-id"}-${index}`}
                className="rounded-2xl bg-slate-50 p-4 text-sm"
              >
                <p className="font-black">
                  Sortie : {formatDate(utilisation.date_sortie)}
                </p>
                <p className="mt-2">Départ : {utilisation.depart || "—"}</p>
                <p className="mt-1">
                  Crédits consommés :{" "}
                  <strong>{utilisation.credits_consommes}</strong>
                </p>
                <p className="mt-1 break-all text-xs text-slate-500">
                  Réservation : {utilisation.reservation_id || "Non disponible"}
                </p>
              </article>
            ))}
            {carnet.historique.length === 0 && (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                Aucune utilisation enregistrée.
              </p>
            )}
          </div>
        </section>

        <section className="mt-7 grid gap-3 sm:grid-cols-2">
          <ActionButton
            label={action === "email" ? "Envoi..." : "Renvoyer par e-mail"}
            disabled={Boolean(action) || !carnet.email}
            onClick={() => onResend(carnet)}
          />
          <ActionButton
            label={
              action === "facture" ? "Préparation..." : "Télécharger la facture"
            }
            disabled={Boolean(action) || !carnet.facture_url}
            onClick={() => onDownload(carnet)}
          />
          <ActionButton
            label="Copier le code"
            onClick={() => onCopy(carnet.code, "Code copié.")}
          />
          <ActionButton
            label="Copier l’adresse e-mail"
            disabled={!carnet.email}
            onClick={() => onCopy(carnet.email, "Adresse e-mail copiée.")}
          />
        </section>

        <section className="mt-7 border-t border-slate-200 pt-7">
          <h3 className="text-lg font-black">Actions administratives</h3>
          <p className="mt-2 text-sm text-slate-600">
            L’annulation conserve les crédits, la facture et l’historique.
            La suppression définitive est réservée aux erreurs et carnets de test.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={Boolean(action) || statutCarnet(carnet) === "annule"}
              onClick={() => onCancel(carnet)}
              className="min-h-12 rounded-2xl bg-red-600 px-4 text-sm font-black text-white disabled:bg-slate-300"
            >
              {action === "annulation"
                ? "Annulation..."
                : statutCarnet(carnet) === "annule"
                  ? "Carnet annulé"
                  : "Annuler le carnet"}
            </button>
            <button
              type="button"
              disabled={Boolean(action)}
              onClick={() => onDelete(carnet)}
              className="min-h-12 rounded-2xl bg-slate-800 px-4 text-sm font-black text-white disabled:bg-slate-300"
            >
              {action === "suppression"
                ? "Suppression..."
                : "Supprimer définitivement"}
            </button>
          </div>
        </section>

        {message && (
          <p className="mt-4 rounded-2xl bg-cyan-50 p-4 text-sm font-bold text-cyan-900">
            {message}
          </p>
        )}
      </aside>
    </div>
  );
}

function NouveauCarnetDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (carnet: CarnetAdmin, warning: string | null) => void;
}) {
  const offreInitiale = OFFRES_CARNETS_BALEINES[0];
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [typeCarnet, setTypeCarnet] = useState<number>(offreInitiale.credits);
  const [dateExpiration, setDateExpiration] = useState(
    DATE_EXPIRATION_CARNETS_BALEINES_MANUEL
  );
  const [modePaiement, setModePaiement] = useState("");
  const [referencePaiement, setReferencePaiement] = useState("");
  const [montantEncaisse, setMontantEncaisse] = useState(
    String(offreInitiale.prix)
  );
  const [commentaireInterne, setCommentaireInterne] = useState("");
  const [factureRemise, setFactureRemise] = useState(false);
  const [envoyerEmail, setEnvoyerEmail] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  function choisirOffre(credits: number) {
    const offre = OFFRES_CARNETS_BALEINES.find(
      (item) => item.credits === credits
    );
    setTypeCarnet(credits);
    if (offre) setMontantEncaisse(String(offre.prix));
  }

  async function creerCarnet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur("");

    const montant = Number(montantEncaisse);
    if (!Number.isSafeInteger(montant) || montant <= 0) {
      setErreur("Le montant encaissé doit être supérieur à 0 F CFP.");
      return;
    }

    setEnvoi(true);

    try {
      const response = await fetch("/api/admin/carnets-baleines/creer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prenom_acheteur: prenom,
          nom_acheteur: nom,
          telephone,
          email,
          type_carnet: typeCarnet,
          date_expiration: dateExpiration,
          mode_paiement: modePaiement,
          reference_paiement: referencePaiement,
          montant_encaisse: montant,
          commentaire_interne: commentaireInterne,
          facture_remise: factureRemise,
          envoyer_email: Boolean(email) && envoyerEmail,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.carnet) {
        setErreur(payload.error || "Impossible de créer le carnet.");
        return;
      }

      onCreated(payload.carnet as CarnetAdmin, payload.warning || null);
    } catch {
      setErreur("Impossible de créer le carnet.");
    } finally {
      setEnvoi(false);
    }
  }

  const inputClass =
    "mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50" onClick={onClose}>
      <aside
        className="ml-auto h-full w-full max-w-2xl overflow-y-auto bg-slate-50 p-5 shadow-2xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
              Création manuelle
            </p>
            <h2 className="mt-2 text-2xl font-black">Nouveau carnet</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={envoi}
            className="rounded-xl border bg-white px-4 py-2 font-black"
          >
            Fermer
          </button>
        </div>

        <form onSubmit={creerCarnet} className="mt-7 space-y-6">
          <fieldset className="grid gap-4 rounded-2xl bg-white p-4 sm:grid-cols-2">
            <legend className="px-2 font-black">Client</legend>
            <label className="text-sm font-bold">
              Prénom *
              <input
                required
                maxLength={100}
                value={prenom}
                onChange={(event) => setPrenom(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="text-sm font-bold">
              Nom *
              <input
                required
                maxLength={100}
                value={nom}
                onChange={(event) => setNom(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="text-sm font-bold">
              Téléphone *
              <input
                required
                maxLength={50}
                type="tel"
                value={telephone}
                onChange={(event) => setTelephone(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="text-sm font-bold">
              E-mail (facultatif)
              <input
                maxLength={254}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
              />
            </label>
          </fieldset>

          <fieldset className="rounded-2xl bg-white p-4">
            <legend className="px-2 font-black">Offre *</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {OFFRES_CARNETS_BALEINES.map((offre) => (
                <label
                  key={offre.credits}
                  className={`cursor-pointer rounded-2xl border p-4 ${
                    typeCarnet === offre.credits
                      ? "border-cyan-700 bg-cyan-50"
                      : "border-slate-200"
                  }`}
                >
                  <input
                    required
                    type="radio"
                    name="offre"
                    checked={typeCarnet === offre.credits}
                    onChange={() => choisirOffre(offre.credits)}
                    className="mr-2"
                  />
                  <strong>{offre.nom}</strong>
                  <span className="mt-1 block text-sm">
                    {formatPrix(offre.prix)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-4 rounded-2xl bg-white p-4 sm:grid-cols-2">
            <legend className="px-2 font-black">Paiement et validité</legend>
            <label className="text-sm font-bold">
              Date d’expiration *
              <input
                required
                type="date"
                value={dateExpiration}
                onChange={(event) => setDateExpiration(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="text-sm font-bold">
              Mode de paiement *
              <select
                required
                value={modePaiement}
                onChange={(event) => setModePaiement(event.target.value)}
                className={inputClass}
              >
                <option value="">Sélectionner</option>
                {MODES_PAIEMENT_CARNET_MANUEL.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold">
              Montant encaissé (F CFP) *
              <input
                required
                min={1}
                max={100000000}
                step={1}
                type="number"
                value={montantEncaisse}
                onChange={(event) => {
                  event.target.setCustomValidity("");
                  setMontantEncaisse(event.target.value);
                }}
                onInvalid={(event) =>
                  event.currentTarget.setCustomValidity(
                    "Le montant encaissé doit être supérieur à 0 F CFP."
                  )
                }
                className={inputClass}
              />
            </label>
            <label className="text-sm font-bold">
              Référence du paiement
              <input
                maxLength={200}
                value={referencePaiement}
                onChange={(event) => setReferencePaiement(event.target.value)}
                placeholder="Chèque, virement, reçu…"
                className={inputClass}
              />
            </label>
            <label className="text-sm font-bold sm:col-span-2">
              Commentaire interne
              <textarea
                maxLength={1000}
                rows={3}
                value={commentaireInterne}
                onChange={(event) => setCommentaireInterne(event.target.value)}
                placeholder="Salon du Tourisme 2026, remise commerciale…"
                className={`${inputClass} py-3`}
              />
            </label>
          </fieldset>

          <label className="flex items-start gap-3 rounded-2xl bg-white p-4 text-sm font-bold">
            <input
              type="checkbox"
              checked={factureRemise}
              onChange={(event) => setFactureRemise(event.target.checked)}
              className="mt-1"
            />
            Facture remise immédiatement
          </label>

          {email && (
            <label className="flex items-start gap-3 rounded-2xl bg-cyan-50 p-4 text-sm font-bold">
              <input
                type="checkbox"
                checked={envoyerEmail}
                onChange={(event) => setEnvoyerEmail(event.target.checked)}
                className="mt-1"
              />
              Envoyer immédiatement le carnet et la facture par e-mail
            </label>
          )}

          {erreur && (
            <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">
              {erreur}
            </p>
          )}

          <button
            type="submit"
            disabled={envoi}
            className="min-h-14 w-full rounded-2xl bg-emerald-600 px-5 text-lg font-black text-white disabled:bg-slate-300"
          >
            {envoi ? "Création en cours…" : "Créer le carnet"}
          </button>
        </form>
      </aside>
    </div>
  );
}

function DetailSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="mt-7">
      <h3 className="text-lg font-black">{title}</h3>
      <div className="mt-3 grid grid-cols-2 gap-3">{children}</div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cyan-50 p-3">
      <p className="text-xs font-black uppercase tracking-wide text-cyan-700">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black">{value}</p>
    </div>
  );
}

function ActionButton({
  disabled = false,
  label,
  onClick,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-12 rounded-2xl bg-cyan-900 px-4 text-sm font-black text-white disabled:bg-slate-300"
    >
      {label}
    </button>
  );
}
