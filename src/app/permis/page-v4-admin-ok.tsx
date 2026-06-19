"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const examens = [
  { label: "Session du 10 juin 2026", value: "10 juin 2026", limite: "2 juin 2026" },
  { label: "Session du 24 juin 2026", value: "24 juin 2026", limite: "16 juin 2026" },
  { label: "Je choisirai plus tard", value: "Plus tard", limite: "" },
];

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

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
const [erreur, setErreur] = useState("");
const [paiementValide, setPaiementValide] = useState(false);
const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);
const [accepteCgv, setAccepteCgv] = useState(false);
const [accepteDocuments, setAccepteDocuments] = useState(false);

  const mercredi = isMercredi(dateCours);
const prix = formule === "Sérénité" ? 33000 : 25000;
const dateAchat = new Date();

const dateLimiteReservation = new Date();
dateLimiteReservation.setMonth(dateLimiteReservation.getMonth() + 6);

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
    return;
  }

  if (!nom.trim()) {
    setErreur("Veuillez renseigner votre nom.");
    return;
  }

  if (!telephone.trim()) {
    setErreur("Veuillez renseigner votre téléphone.");
    return;
  }

  if (!email.trim()) {
    setErreur("Veuillez renseigner votre email.");
    return;
  }
if (!accepteDocuments) {
  setErreur("Veuillez confirmer avoir pris connaissance des documents à fournir.");
  return;
}

if (!accepteCgv) {
  setErreur("Veuillez accepter les conditions générales de vente.");
  return;
}

  setErreur("");
const { error } = await supabase
  .from("reservations")
  .insert([
    {
      prenom,
      nom,
      telephone,
      email,
      formule,
      examen: session,
      date_cours: dateCours?.toLocaleDateString("fr-FR") || null,
      type_cours: typeCours || null,
      creneau: creneau || null,
    },
  ]);

if (error) {
  console.error(error);
  setErreur("Erreur lors de l'enregistrement.");
  setEnregistrementEnCours(false);
  return;
}
  setPaiementValide(true);
setEnregistrementEnCours(false);
}const recap = (
    <div className="mt-6 bg-sky-100 text-black rounded-xl p-4">
      <h4 className="text-xl font-bold mb-3">Vérifiez votre réservation</h4>

      <p><strong>Formule :</strong> {formule}</p>
<p>
  <strong>Prix :</strong> {prix.toLocaleString("fr-FR")} XPF
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
  Total à régler : {prix.toLocaleString("fr-FR")} XPF
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

      {recap}

<div className="mt-6 bg-sky-50 rounded-xl p-4">
  <h4 className="text-xl font-bold mb-3">
    Documents nécessaires
  </h4>

  <ul className="list-disc ml-6 space-y-1">
    <li>Pièce d&apos;identité</li>
    <li>Photo d&apos;identité</li>
    <li>Justificatif de domicile</li>
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
  disabled={enregistrementEnCours}
    className="mt-6 w-full bg-yellow-500 text-black font-bold p-4 rounded-xl"
  >
    {enregistrementEnCours
  ? "Enregistrement..."
  : "Simuler le paiement"}
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
    ⚠️ Aucun dossier incomplet ne pourra être présenté à l'examen.
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
  </div>
)}
    </div>
  );

  return (
    <main className="min-h-screen bg-sky-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">⚓ Permis Côtier</h1>

        <div className="mb-8 grid grid-cols-4 gap-2 text-center text-sm">
          <div className={`rounded-xl p-3 ${formule ? "bg-green-600" : "bg-sky-800"}`}>1. Formule</div>
          <div className={`rounded-xl p-3 ${session ? "bg-green-600" : "bg-sky-800"}`}>2. Examen</div>
          <div className={`rounded-xl p-3 ${reservation ? "bg-green-600" : "bg-sky-800"}`}>3. Cours</div>
          <div className={`rounded-xl p-3 ${creneau || reservation === "plus tard" ? "bg-green-600" : "bg-sky-800"}`}>4. Paiement</div>
        </div>

        {formule && (
          <button onClick={retour} className="mb-6 bg-slate-700 hover:bg-slate-600 px-5 py-3 rounded-xl">
            ← Retour
          </button>
        )}

        {!formule && (
          <div className="grid md:grid-cols-2 gap-6">
            <button onClick={() => setFormule("Classique")} className="bg-sky-800 rounded-2xl p-6 text-left hover:bg-sky-700">
              <h2 className="text-2xl font-bold mb-4">Formule Classique</h2>
              <p className="text-4xl font-bold mb-4">25 000 XPF</p>
              <p>Application de code, cours pratique, dossier, examen.</p>
              <p className="mt-4 text-red-200">Timbres fiscaux à fournir.</p>
            </button>

            <button onClick={() => setFormule("Sérénité")} className="bg-cyan-700 rounded-2xl p-6 text-left hover:bg-cyan-600">
              <h2 className="text-2xl font-bold mb-4">Formule Sérénité</h2>
              <p className="text-4xl font-bold mb-4">33 000 XPF</p>
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
                onChange={(value) => setDateCours(value as Date)}
                value={dateCours}
                minDate={new Date()}
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
              {creneauxDisponibles.map((horaire) => (
                <button
                  key={horaire}
                  onClick={() => setCreneau(horaire)}
                  className="w-full bg-blue-600 p-4 rounded-xl hover:bg-blue-500"
                >
                  {horaire}
                </button>
              ))}
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