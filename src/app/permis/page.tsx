"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { permisDocuments } from "@/lib/permisDocuments";
import {
  formatXpf,
  getPermisPriceForFormula,
  getPermisPricing,
} from "@/lib/permisPricing";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const joursFeriesPolynesie = [
  "2026-01-01",
  "2026-03-05",
  "2026-04-03",
  "2026-04-06",
  "2026-05-01",
  "2026-05-08",
  "2026-05-14",
  "2026-05-25",
  "2026-06-29",
  "2026-07-14",
  "2026-08-15",
  "2026-11-01",
  "2026-11-11",
  "2026-12-25",
];

function formatDateISO(date: Date) {
  return date.toISOString().split("T")[0];
}

function formatDateFR(date: Date) {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const moisFrancais: Record<string, number> = {
  janvier: 0,
  fevrier: 1,
  février: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  aout: 7,
  août: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  decembre: 11,
  décembre: 11,
};

function getIsoDepuisLibelleExamen(session: string) {
  const sessionTrimmee = session.trim().toLowerCase();
  const matchNumerique = sessionTrimmee.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (matchNumerique) {
    const [, jour, mois, annee] = matchNumerique;
    return `${annee}-${mois.padStart(2, "0")}-${jour.padStart(2, "0")}`;
  }

  const matchTexte = sessionTrimmee.match(/^(\d{1,2})\s+([a-zÃ©Ã¨ÃªÃ«Ã Ã¢Ã®Ã¯Ã´Ã»Ã¹Ã¼Ã§]+)\s+(\d{4})$/i);
  if (!matchTexte) return "";

  const [, jour, mois, annee] = matchTexte;
  const indexMois = moisFrancais[mois];
  if (indexMois === undefined) return "";

  return `${annee}-${String(indexMois + 1).padStart(2, "0")}-${jour.padStart(2, "0")}`;
}

function ajouterJours(date: Date, jours: number) {
  const nouvelleDate = new Date(date);
  nouvelleDate.setDate(nouvelleDate.getDate() + jours);
  return nouvelleDate;
}

function genererExamens() {
  const aujourdHui = new Date();
  aujourdHui.setHours(0, 0, 0, 0);

  const examensDisponibles = [];
  const date = new Date(aujourdHui);

  while (examensDisponibles.length < 4) {
    date.setDate(date.getDate() + 1);

    const estMercredi = date.getDay() === 3;

    if (!estMercredi) continue;

    let dateExamen = new Date(date);

    if (joursFeriesPolynesie.includes(formatDateISO(dateExamen))) {
      dateExamen = ajouterJours(dateExamen, 1);
    }

    const limiteInscription = ajouterJours(dateExamen, -8);

    if (aujourdHui <= limiteInscription) {
      examensDisponibles.push({
  label: `Session du ${formatDateFR(dateExamen)}`,
  value: formatDateFR(dateExamen),
  limite: formatDateFR(limiteInscription),
  iso: formatDateISO(dateExamen),
});
    }
  }

  return [
    ...examensDisponibles,
    { label: "Je choisirai plus tard", value: "Plus tard", limite: "" },
  ];
}


const creneauxIndividuels = [
  "07h00 - 09h00",
  "09h00 - 11h00",
  "11h00 - 13h00",
  "13h00 - 15h00",
  "15h00 - 17h00",
];

const creneauxCommuns = [
  "07h00 - 11h00",
  "09h00 - 13h00",
  "11h00 - 15h00",
  "13h00 - 17h00",
];

function isMercredi(date: Date | null) {
  if (!date) return false;
  return date.getDay() === 3;
}

export default function PermisPage() {
  const [formule, setFormule] = useState("");
  const [session, setSession] = useState("");
  const [limiteDossier, setLimiteDossier] = useState("");
  const [reservation, setReservation] = useState("");
  const [dateCours, setDateCours] = useState<Date | null>(null);
  const [typeCours, setTypeCours] = useState("");
  const [creneau, setCreneau] = useState("");
const [creneauxReserves, setCreneauxReserves] = useState<string[]>([]);

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
const [prenom2, setPrenom2] = useState("");
const [nom2, setNom2] = useState("");
const [erreur, setErreur] = useState("");
const [paiementValide] = useState(false);
const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);
const [accepteCgv, setAccepteCgv] = useState(false);
const [accepteDocuments, setAccepteDocuments] = useState(false);
const [datesExamensBloques, setDatesExamensBloques] = useState<string[]>([]);
const [reservationsPromotionnellesVendues, setReservationsPromotionnellesVendues] =
  useState(0);

useEffect(() => {
  async function chargerDonneesPermis() {
    const examensBloquesResponse = await supabase
      .from("examens_bloques")
      .select("date_examen");

    if (examensBloquesResponse.error) {
      console.error(examensBloquesResponse.error);
    } else {
      setDatesExamensBloques(
        (examensBloquesResponse.data || []).map((item) => item.date_examen)
      );
    }

    const reservationsResponse = await supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("pricing_type", "promo_internet");

    if (reservationsResponse.error) {
      console.error(reservationsResponse.error);
      return;
    }

    setReservationsPromotionnellesVendues(reservationsResponse.count || 0);
  }

  chargerDonneesPermis();
}, []);

const permisPricing = getPermisPricing({
  promotionReservationsSold: reservationsPromotionnellesVendues,
});

const examens = genererExamens().filter(
  (examen) =>
    examen.value === "Plus tard" ||
    (examen.iso && !datesExamensBloques.includes(examen.iso))
);

const reservationPermisPricing =
  session === "Plus tard" && permisPricing.pricingType === "promo_internet"
    ? getPermisPricing({ promotionReservationsSold: Number.MAX_SAFE_INTEGER })
    : permisPricing;

const examenSelectionne = examens.find((examen) => examen.value === session);
const dateExamenIsoSelectionnee =
  examenSelectionne?.iso || getIsoDepuisLibelleExamen(session);

  const mercredi = isMercredi(dateCours);
const prixBase = getPermisPriceForFormula(formule, reservationPermisPricing);
const nombreParticipants = typeCours === "commun" ? 2 : 1;
const prix = prixBase * nombreParticipants;
const dateAchat = new Date();

const dateLimiteReservation = new Date();
dateLimiteReservation.setMonth(dateLimiteReservation.getMonth() + 6);

async function chargerCreneauxReserves(date: Date) {
  const dateFormatee = date.toLocaleDateString("fr-FR");

  const { data, error } = await supabase
    .from("reservations")
    .select("creneau")
    .eq("date_cours", dateFormatee);

  if (error) {
    console.error(error);
    return;
  }

  setCreneauxReserves(
    (data || [])
      .map((reservation) => reservation.creneau)
      .filter(Boolean)
  );
}  
function horaireEnMinutes(horaire: string) {
  const [debut, fin] = horaire.split(" - ");

  const [debutHeure, debutMinute] = debut.replace("h", ":").split(":").map(Number);
  const [finHeure, finMinute] = fin.replace("h", ":").split(":").map(Number);

  return {
    debut: debutHeure * 60 + debutMinute,
    fin: finHeure * 60 + finMinute,
  };
}

function creneauDisponible(horaire: string) {
  const nouveau = horaireEnMinutes(horaire);

  return !creneauxReserves.some((reserve) => {
    const existant = horaireEnMinutes(reserve);

    return nouveau.debut < existant.fin && existant.debut < nouveau.fin;
  });
}

function getErreurDateCours(date: Date | null) {
  if (session === "Plus tard" || !date || !dateExamenIsoSelectionnee) {
    return "";
  }

  return formatDateISO(date) >= dateExamenIsoSelectionnee
    ? "Le cours pratique doit avoir lieu avant la date d'examen."
    : "";
}

function getDateDepuisIso(iso: string) {
  const [annee, mois, jour] = iso.split("-").map(Number);

  if (!annee || !mois || !jour) return null;

  return new Date(annee, mois - 1, jour);
}

function getDateMaxCours() {
  if (session === "Plus tard" || !dateExamenIsoSelectionnee) return undefined;

  const dateExamen = getDateDepuisIso(dateExamenIsoSelectionnee);
  if (!dateExamen) return undefined;

  const dateMax = new Date(dateExamen);
  dateMax.setDate(dateMax.getDate() - 1);
  return dateMax;
}

const dateMaxCours = getDateMaxCours();

const creneauxDisponibles =
    typeCours === "commun"
      ? mercredi
        ? ["13h00 - 17h00"]
        : creneauxCommuns
      : mercredi
      ? ["13h00 - 15h00", "15h00 - 17h00"]
      : creneauxIndividuels;

  function retour() {
  if (creneau) setCreneau("");
  else if (typeCours) setTypeCours("");
  else if (dateCours) setDateCours(null);
  else if (reservation) setReservation("");
  else if (session) {
    setSession("");
    setLimiteDossier("");
  } else if (formule) setFormule("");
}

async function verifierAvantPaiement() {
  if (enregistrementEnCours) return;

  setEnregistrementEnCours(true);

  if (!prenom.trim()) {
    setErreur("Veuillez renseigner votre prénom.");
    setEnregistrementEnCours(false);
    return;
  }

  if (!nom.trim()) {
    setErreur("Veuillez renseigner votre nom.");
    setEnregistrementEnCours(false);
    return;
  }

  if (!telephone.trim()) {
    setErreur("Veuillez renseigner votre téléphone.");
    setEnregistrementEnCours(false);
    return;
  }

  if (!email.trim()) {
    setErreur("Veuillez renseigner votre email.");
    setEnregistrementEnCours(false);
    return;
  }

  if (reservationPermisPricing.requiresExam && session === "Plus tard") {
    setErreur("Veuillez choisir une date d'examen pour bénéficier de l'offre de lancement.");
    setEnregistrementEnCours(false);
    return;
  }

  const erreurDateCours = getErreurDateCours(dateCours);
  if (erreurDateCours) {
    setErreur(erreurDateCours);
    setEnregistrementEnCours(false);
    return;
  }

  if (typeCours === "commun") {
    if (!prenom2.trim()) {
      setErreur("Veuillez renseigner le prénom du participant n°2.");
      setEnregistrementEnCours(false);
      return;
    }

    if (!nom2.trim()) {
      setErreur("Veuillez renseigner le nom du participant n°2.");
      setEnregistrementEnCours(false);
      return;
    }
  }

  if (!accepteDocuments) {
    setErreur("Veuillez confirmer avoir pris connaissance des documents à fournir.");
    setEnregistrementEnCours(false);
    return;
  }

  if (!accepteCgv) {
    setErreur("Veuillez accepter les conditions générales de vente.");
    setEnregistrementEnCours(false);
    return;
  }

  setErreur("");

  const { data: reservationCreee, error } = await supabase
    .from("reservations")
    .insert([
      {
        prenom,
        nom,
prenom2: typeCours === "commun" ? prenom2 : null,
nom2: typeCours === "commun" ? nom2 : null,
        telephone,
        email,
        formule,
        examen: session,
        date_cours: dateCours?.toLocaleDateString("fr-FR") || null,
        type_cours: typeCours || null,
        creneau: creneau || null,
paiement_effectue: false,
        pricing_type: reservationPermisPricing.pricingType,
        pricing_amount: prix,
      },
    ])
    .select("id")
    .single();

  if (error) {
    console.error(error);
    setErreur("Erreur lors de l'enregistrement.");
    setEnregistrementEnCours(false);
    return;
  }

  const reponsePayzen = await fetch("/api/payzen", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
  montant: prix,
  email,
  reservationId: String(reservationCreee.id),
  reservationTable: "reservations",
  activity: "permis",
}),
});

const paiement = await reponsePayzen.json();

if (!reponsePayzen.ok) {
  console.error(paiement);
  setErreur("Erreur lors de la préparation du paiement.");
  setEnregistrementEnCours(false);
  return;
}

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
const erreurDateCoursRecap = getErreurDateCours(dateCours);
const recap = (
    <div className="mt-6 bg-sky-100 text-black rounded-xl p-4">
      <h4 className="text-xl font-bold mb-3">Vérifiez votre réservation</h4>

      <p><strong>Formule :</strong> {formule}</p>
<p>
  <strong>Prix :</strong> {formatXpf(prix)}
</p>

      <p>
        <strong>Examen :</strong>{" "}
        {session === "Plus tard" ? "à choisir plus tard" : session}
      </p>

      {session === "Plus tard" ? (
        <p>
          <strong>Dossier :</strong> à retourner au maximum 8 jours avant l&apos;examen choisi
        </p>
      ) : (
        <p>
          <strong>Dossier à retourner avant :</strong> {limiteDossier}
        </p>
      )}
{session !== "Plus tard" && reservation === "plus tard" && (
  <div className="mt-4 bg-yellow-100 border border-yellow-400 text-yellow-900 p-4 rounded-xl">
    ⚠️ Vous avez choisi une date d&apos;examen mais aucun cours pratique n&apos;est réservé.
    Pensez à réserver votre cours suffisamment tôt avant l&apos;examen.
  </div>
)}

      {reservation === "maintenant" ? (
        <>
          <p>
            <strong>Cours pratique :</strong>{" "}
            {typeCours === "individuel"
              ? "individuel, 1 personne, 2h"
              : "commun, 2 personnes maximum, 4h"}
          </p>

          <p>
            <strong>Date du cours :</strong>{" "}
            {dateCours?.toLocaleDateString("fr-FR")}
          </p>

          {erreurDateCoursRecap && (
            <div className="mt-4 bg-red-100 text-red-700 p-4 rounded-xl">
              {erreurDateCoursRecap}
            </div>
          )}

          <p><strong>Créneau :</strong> {creneau}</p>
        </>
      ) : (
        <>
          <p>
            <strong>Cours pratique :</strong> à réserver plus tard depuis votre espace client
          </p>

          <p>
            <strong>Validité :</strong> 6 mois à partir de la date d&apos;achat
          </p>
        </>
      )}
<div className="mt-4 border-t pt-4 text-xl font-bold">
  Total à régler : {formatXpf(prix)}
</div>
    </div>
  );

  const formulaireClient = (
    <div className="mt-6 bg-white text-black rounded-2xl p-6">
      <h3 className="text-2xl font-bold mb-4">Vos informations</h3>

      <div className="grid md:grid-cols-2 gap-4">
        <input className="p-3 rounded-xl border" placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
        <input className="p-3 rounded-xl border" placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} />
        <input className="p-3 rounded-xl border" placeholder="Téléphone" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        <input className="p-3 rounded-xl border" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
{typeCours === "commun" && (
  <div className="mt-6">
    <h4 className="text-xl font-bold mb-4">
      Participant n°2
    </h4>

    <div className="grid md:grid-cols-2 gap-4">
      <input
        className="p-3 rounded-xl border"
        placeholder="Prénom participant 2"
        value={prenom2}
        onChange={(e) => setPrenom2(e.target.value)}
      />

      <input
        className="p-3 rounded-xl border"
        placeholder="Nom participant 2"
        value={nom2}
        onChange={(e) => setNom2(e.target.value)}
      />
    </div>
  </div>
)}

      {recap}

<div className="mt-6 bg-sky-50 rounded-xl p-4">
  <h4 className="text-xl font-bold mb-3">
    Documents nécessaires
  </h4>

  <ul className="list-disc ml-6 space-y-1">
    <li>Pièce d&apos;identité</li>
    <li>Photo d&apos;identité</li>
    <li>Certificat d&apos;aptitude physique rempli par le médecin</li>
    <li>Formulaire d&apos;inscription complété</li>

    {formule === "Classique" ? (
      <li>Timbres fiscaux à déposer auprès de Tahiti Trip Fishing</li>
    ) : (
      <li>Timbres fiscaux pris en charge par Tahiti Trip Fishing</li>
    )}
  </ul>
</div>

<div className="mt-6 space-y-3">
  <label className="flex gap-3 items-start">
    <input
      type="checkbox"
      checked={accepteDocuments}
      onChange={(e) => setAccepteDocuments(e.target.checked)}
      className="mt-1"
    />
    <span>
      Je confirme avoir pris connaissance des documents à fournir pour le dossier.
    </span>
  </label>

  <label className="flex gap-3 items-start">
    <input
      type="checkbox"
      checked={accepteCgv}
      onChange={(e) => setAccepteCgv(e.target.checked)}
      className="mt-1"
    />
    <span>
      J&apos;accepte les conditions générales de vente.
    </span>
  </label>
</div>
  {erreur && (
    <div className="mt-4 bg-red-100 text-red-700 p-4 rounded-xl">
      {erreur}
    </div>
  )}

  <button
  onClick={verifierAvantPaiement}
  disabled={enregistrementEnCours || Boolean(erreurDateCoursRecap)}
    className="mt-6 w-full bg-yellow-500 text-black font-bold p-4 rounded-xl"
  >
    {enregistrementEnCours
  ? "Enregistrement..."
  : "Payer maintenant"}
  </button>
{paiementValide && (
  <div className="mt-6 bg-green-100 text-green-900 rounded-2xl p-6">
    <h3 className="text-2xl font-bold mb-4">
      ✅ Réservation enregistrée
    </h3>

    <p className="mb-4">
      Merci {prenom}, votre demande a bien été prise en compte.
    </p>
<div className="bg-blue-100 rounded-xl p-4 mb-4">
  <p>
    📧 Les documents devront être envoyés par email.
  </p>

  <p className="mt-2">
    ⚠️ Aucun dossier incomplet ne pourra être présenté à l&apos;examen.
  </p>
</div>

    <h4 className="text-xl font-bold mb-3">
      Documents à fournir
    </h4>

    <ul className="list-disc ml-6 space-y-1">
  <li>Certificat d&apos;aptitude physique (PDF)</li>
  <li>Formulaire d&apos;inscription complété (PDF)</li>
  <li>Photo d&apos;identité récente (JPEG)</li>
  <li>Photocopie de la pièce d&apos;identité (PDF)</li>

  {formule === "Classique" ? (
    <li>
      Timbres fiscaux à remettre à Tahiti Trip Fishing avant le dépôt du dossier
    </li>
  ) : (
    <li>
      Timbres fiscaux pris en charge par Tahiti Trip Fishing
    </li>
  )}
</ul>

    

<div className="mt-4 bg-white rounded-xl p-4">
  <p>
    <strong>Date d&apos;achat :</strong>{" "}
    {dateAchat.toLocaleDateString("fr-FR")}
  </p>

  <p>
    <strong>Formation valable jusqu&apos;au :</strong>{" "}
    {dateLimiteReservation.toLocaleDateString("fr-FR")}
  </p>
</div>    
<p className="mt-4 font-bold">
      {session === "Plus tard"
        ? "Le dossier devra être retourné au maximum 8 jours avant la date d'examen choisie."
        : `Dossier complet à retourner au plus tard le ${limiteDossier}.`}
    </p>
{reservation === "plus tard" && (
  <div className="mt-6 bg-blue-100 rounded-xl p-4">
    <p className="font-bold mb-3">
      Vous pourrez reprendre votre réservation à tout moment.
    </p>

    <a
      href="/reprendre-reservation"
      className="inline-block bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-500"
    >
      Reprendre ma réservation
    </a>
  </div>
)}
  </div>
)}
    </div>
  );

  return (
    <main className="min-h-screen bg-sky-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">⚓ Permis Côtier</h1>

        <section className="mb-8 rounded-2xl bg-white p-6 text-slate-950 shadow-xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-cyan-700">
            Dossier permis
          </p>
          <h2 className="mt-2 text-2xl font-bold">Documents à remplir et à déposer</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
            Les documents complétés devront être déposés en PDF au minimum
            8 jours avant la date de votre examen.
          </p>
          <p className="mt-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-bold leading-6 text-yellow-950">
            Attention : sans dépôt complet du dossier au moins 8 jours avant
            l&apos;examen, votre inscription à l&apos;examen ne pourra pas être
            garantie.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {permisDocuments.map((document) => (
              <a
                key={document.key}
                href={document.href}
                download={document.filename}
                className="rounded-xl border border-cyan-100 bg-cyan-50 p-4 font-bold text-cyan-950 transition hover:-translate-y-0.5 hover:bg-cyan-100"
              >
                <span className="block">
                  {document.key === "certificat-medical"
                    ? "Télécharger le certificat médical"
                    : "Télécharger le formulaire d'inscription"}
                </span>
                <span className="mt-1 block text-sm font-semibold text-slate-600">
                  {document.description}
                </span>
              </a>
            ))}
            <a
              href="/reprendre-reservation"
              className="rounded-xl border border-yellow-200 bg-yellow-100 p-4 font-bold text-yellow-950 transition hover:-translate-y-0.5 hover:bg-yellow-200"
            >
              <span className="block">Déposer mes documents</span>
              <span className="mt-1 block text-sm font-semibold text-slate-700">
                Accéder à ma réservation
              </span>
            </a>
          </div>
        </section>

        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs md:text-sm">
          <div className={`rounded-xl p-3 ${formule ? "bg-green-600" : "bg-sky-800"}`}>1. Formule</div>
          <div className={`rounded-xl p-3 ${session ? "bg-green-600" : "bg-sky-800"}`}>2. Examen</div>
          <div className={`rounded-xl p-3 ${reservation ? "bg-green-600" : "bg-sky-800"}`}>3. Cours</div>
          <div className={`rounded-xl p-3 ${creneau || reservation === "plus tard" ? "bg-green-600" : "bg-sky-800"}`}>4. Paiement</div>
        </div>

        {permisPricing.isPromotionActive && (
          <section className="mb-8 rounded-2xl border border-yellow-200 bg-yellow-100 p-5 text-yellow-950 shadow-xl">
            <h2 className="text-2xl font-bold">🔥 Offre de lancement</h2>
            <p className="mt-2 font-semibold">
              Plus que {permisPricing.promotionsRemaining} permis
              promotionnels disponibles.
            </p>
            <p className="mt-1 text-sm font-semibold">
              Une date d&apos;examen doit être choisie pour réserver avec ce
              tarif.
            </p>
          </section>
        )}

        {permisPricing.pricingType === "salon_tourisme" && (
          <section className="mb-8 rounded-2xl border border-cyan-200 bg-cyan-100 p-5 text-cyan-950 shadow-xl">
            <h2 className="text-2xl font-bold">Tarifs Salon du Tourisme</h2>
            <p className="mt-2 font-semibold">
              Du 4 au 6 septembre 2026 inclus, les prix Internet s&apos;alignent
              automatiquement sur les tarifs du salon.
            </p>
          </section>
        )}

        {formule && (
          <button onClick={retour} className="mb-6 cursor-pointer bg-slate-700 hover:bg-slate-600 px-5 py-3 rounded-xl">
            ← Retour
          </button>
        )}

        {!formule && (
          <div className="grid md:grid-cols-2 gap-6">
            <button onClick={() => setFormule("Classique")} className="cursor-pointer bg-sky-800 rounded-2xl p-6 text-left hover:bg-sky-700">
              <h2 className="text-2xl font-bold mb-4">Formule Classique</h2>
              <p className="text-4xl font-bold mb-4">
                {formatXpf(permisPricing.prices.Classique)}
              </p>
              <p>Application de code, cours pratique, dossier, examen.</p>
              <p className="mt-4 text-red-200">Timbres fiscaux à fournir.</p>
            </button>

            <button onClick={() => setFormule("Sérénité")} className="cursor-pointer bg-cyan-700 rounded-2xl p-6 text-left hover:bg-cyan-600">
              <h2 className="text-2xl font-bold mb-4">Formule Sérénité</h2>
              <p className="text-4xl font-bold mb-4">
                {formatXpf(permisPricing.prices.Sérénité)}
              </p>
              <p>Application de code, cours pratique, dossier, examen.</p>
              <p className="mt-4 text-green-200">Tahiti Trip Fishing s&apos;occupe des timbres fiscaux.</p>
            </button>
          </div>
        )}

        {formule && !session && (
          <section className="bg-sky-800 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">Formule choisie : {formule}</h2>
            <h3 className="text-xl mb-4">Choisissez votre date d&apos;examen</h3>

            <div className="space-y-4">
              {examens.map((examen) => (
                <button
                  key={examen.value}
                  onClick={() => {
                    setSession(examen.value);
                    setLimiteDossier(examen.limite);
                  }}
                  className="w-full bg-cyan-600 p-4 rounded-xl hover:bg-cyan-500"
                >
                  {examen.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {formule && session && !reservation && (
          <section className="bg-sky-800 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">
              Examen : {session === "Plus tard" ? "à choisir plus tard" : session}
            </h2>

            {session === "Plus tard" ? (
              <p className="mb-6 text-yellow-200">
                Le dossier devra être retourné au maximum 8 jours avant l&apos;examen choisi.
              </p>
            ) : (
              <p className="mb-6 text-yellow-200">
                Dossier complet à retourner par mail au plus tard le <strong>{limiteDossier}</strong>.
              </p>
            )}

            <p className="mb-6">Voulez-vous réserver votre cours pratique maintenant ?</p>

            <div className="grid md:grid-cols-2 gap-4">
              <button onClick={() => setReservation("maintenant")} className="bg-green-600 p-4 rounded-xl hover:bg-green-500">
                Réserver maintenant
              </button>

              <button onClick={() => setReservation("plus tard")} className="bg-slate-600 p-4 rounded-xl hover:bg-slate-500">
                Je réserverai plus tard
              </button>
            </div>
          </section>
        )}

        {reservation === "maintenant" && !dateCours && (
          <section className="bg-cyan-900 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">Choisissez la date du cours pratique</h2>

            <div className="bg-white text-black rounded-2xl p-6 shadow-xl">
              <Calendar
                onChange={(value) => {
  const date = value as Date;
  const erreurDateCours = getErreurDateCours(date);
  if (erreurDateCours) {
    setErreur(erreurDateCours);
    setDateCours(null);
    setTypeCours("");
    setCreneau("");
    return;
  }

  setErreur("");
  setDateCours(date);
  chargerCreneauxReserves(date);
}}
                value={dateCours}
                minDate={new Date()}
                maxDate={dateMaxCours}
                locale="fr-FR"
                className="w-full border-none"
              />
            </div>
          </section>
        )}

        {reservation === "maintenant" && dateCours && !typeCours && (
          <section className="bg-cyan-900 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">
              Date choisie : {dateCours.toLocaleDateString("fr-FR")}
            </h2>

            {mercredi && (
              <p className="mb-6 text-yellow-200">
                Mercredi matin réservé aux examens : créneaux disponibles uniquement à partir de 13h00.
              </p>
            )}

            <div className="space-y-4">
              <button onClick={() => setTypeCours("individuel")} className="w-full bg-blue-600 p-4 rounded-xl hover:bg-blue-500">
                Cours individuel — 1 personne — 2h
              </button>

              <button onClick={() => setTypeCours("commun")} className="w-full bg-blue-600 p-4 rounded-xl hover:bg-blue-500">
                Cours commun — 2 personnes maximum — 4h
              </button>
            </div>
          </section>
        )}

        {reservation === "maintenant" && dateCours && typeCours && !creneau && (
  <section className="bg-cyan-900 rounded-2xl p-8">
    <h2 className="text-2xl font-bold mb-4">Choisissez votre créneau</h2>

    <div className="space-y-4">
      {creneauxDisponibles.map((horaire) => {
        const disponible = creneauDisponible(horaire);

        return (
          <button
            key={horaire}
            disabled={!disponible}
            onClick={() => disponible && setCreneau(horaire)}
            className={`w-full p-4 rounded-xl text-left font-bold ${
              disponible
                ? "cursor-pointer bg-green-600 hover:bg-green-500"
                : "cursor-not-allowed bg-red-700 opacity-80"
            }`}
          >
            <div>{horaire}</div>
            <div className="text-sm">
              {disponible ? "Disponible" : "Déjà réservé"}
            </div>
          </button>
        );
      })}
    </div>
  </section>
)}
        {reservation === "maintenant" && dateCours && typeCours && creneau && (
          <section className="bg-green-800 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">Résumé de votre réservation</h2>
            {formulaireClient}
          </section>
        )}

        {reservation === "plus tard" && (
          <section className="bg-cyan-900 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">Réservation plus tard</h2>

            <p className="mb-4">
              Votre permis sera valable 6 mois à partir de la date d&apos;achat.
            </p>

            <p className="mb-6">
              Vous pourrez réserver votre cours pratique plus tard depuis votre espace client.
            </p>

            {formulaireClient}
          </section>
        )}
      </div>
    </main>
  );
}
