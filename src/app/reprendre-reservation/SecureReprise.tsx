"use client";
import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import UploadDocuments from "@/app/UploadDocuments";
import { afficherDatePermis, datePermis } from "@/lib/permisPlanning";
import { getTahitiTodayAsLocalDate } from "@/lib/tahiti-date";
import type { PermisPlanning } from "@/lib/permisScheduling";

type DocumentKind = "certificat" | "formulaire" | "photo" | "identite";
type Dossier = PermisPlanning & { prenom: string | null; nom: string | null; prenom2: string | null; nom2: string | null; formule: string | null; statut: string | null; documents: Record<DocumentKind, boolean> };
const genericMessage = "Si un dossier correspondant existe, un code a été envoyé à l’adresse email enregistrée.";
const inputClass = "w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900";
const buttonClass = "mt-4 w-full rounded-xl bg-yellow-500 p-4 font-bold text-black disabled:opacity-50";

export default function SecureReprise() {
  const [mode, setMode] = useState<"email" | "telephone">("email");
  const [contact, setContact] = useState(""), [challenge, setChallenge] = useState(""), [code, setCode] = useState("");
  const [row, setRow] = useState<Dossier | null>(null), [patch, setPatch] = useState<Partial<PermisPlanning>>({});
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const [availability, setAvailability] = useState<{ exams: string[]; slots: string[] } | null>(null);
  const [availabilityError, setAvailabilityError] = useState(""), [revision, setRevision] = useState(0);
  const [documents, setDocuments] = useState<Partial<Record<DocumentKind, File | null>>>({}), [uploadKey, setUploadKey] = useState(0);
  const current = row ? { examen: row.examen, date_cours: row.date_cours, creneau: row.creneau, ...patch } : { examen: null, date_cours: null, creneau: null };
  const day = datePermis(current.date_cours);

  async function api(path: string, init?: RequestInit) {
    const response = await fetch("/api/permis/reprise/" + path, { ...init, cache: "no-store", credentials: "same-origin" });
    const payload = await response.json();
    if (response.status === 401) { setRow(null); setChallenge(""); setCode(""); setDocuments({}); }
    if (!response.ok) throw new Error(payload.error || "Service indisponible. Réessayez.");
    return payload;
  }
  async function load() {
    const payload = await api("reservation");
    setRow(payload.reservation); setPatch({}); setRevision(value => value + 1);
  }
  // Restore only a verified server session; no dossier data is stored in the browser.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/permis/reprise/reservation", { cache: "no-store", credentials: "same-origin" })
      .then(async response => { if (response.ok) { const payload = await response.json(); if (!cancelled) setRow(payload.reservation); } })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!row) return;
    let cancelled = false;
    setAvailability(null); setAvailabilityError("");
    api("disponibilites" + (day ? "?date=" + day : ""))
      .then(value => { if (!cancelled) setAvailability(value); })
      .catch(reason => { if (!cancelled) setAvailabilityError(reason.message); });
    return () => { cancelled = true; };
    // A successful save/reload refreshes occupancy even when the date is unchanged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!row, day, revision]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  }
  const post = (body: unknown) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  async function requestCode() {
    await run(async () => {
      const payload = await api("access", post({ action: "request", [mode]: contact }));
      setChallenge(payload.challengeId); setCode(""); setMessage(genericMessage);
    });
  }
  async function verifyCode() {
    await run(async () => { await api("access", post({ action: "verify", challengeId: challenge, code })); await load(); setChallenge(""); setCode(""); setContact(""); });
  }
  async function save() {
    await run(async () => {
      const result = await api("planning", { ...post(patch), method: "PATCH" });
      setRow(value => value ? { ...value, ...result.planning } : null); setPatch({}); setRevision(value => value + 1);
      setMessage(result.changed ? "Réservation mise à jour avec succès." : "Aucune modification à enregistrer.");
    });
  }
  async function upload() {
    await run(async () => {
      const entries = Object.entries(documents).filter((entry): entry is [DocumentKind, File] => entry[1] instanceof File);
      if (!entries.length) throw new Error("Veuillez sélectionner au moins un document.");
      for (const [kind, file] of entries) {
        const body = new FormData(); body.set("kind", kind); body.set("file", file);
        await api("documents", { method: "POST", body });
        setRow(value => value ? { ...value, documents: { ...value.documents, [kind]: true } } : null);
        setDocuments(value => ({ ...value, [kind]: null }));
      }
      setUploadKey(value => value + 1); setMessage("Documents déposés avec succès.");
    });
  }
  return <main className="min-h-screen bg-sky-950 p-4 text-white md:p-6"><div className="mx-auto max-w-3xl">
    <h1 className="mb-8 text-3xl font-bold md:text-4xl">Reprendre ma réservation</h1>
    {!row ? <section className="rounded-2xl bg-white p-5 text-slate-900 md:p-6">
      <h2 className="mb-4 text-2xl font-bold">Retrouvez votre dossier</h2>
      <form onSubmit={event => { event.preventDefault(); void requestCode(); }}>
        <label className="mb-2 block font-semibold" htmlFor="contact-mode">Rechercher avec</label>
        <select id="contact-mode" className={inputClass} value={mode} disabled={busy} onChange={event => { setMode(event.target.value as typeof mode); setContact(""); setChallenge(""); setMessage(""); }}>
          <option value="email">Mon email</option><option value="telephone">Mon téléphone</option>
        </select>
        <label htmlFor="candidate-contact" className="mb-2 mt-4 block">{mode === "email" ? "Email utilisé lors de l’achat" : "Téléphone utilisé lors de l’achat"}</label>
        <input id="candidate-contact" className={inputClass} type={mode === "email" ? "email" : "tel"} autoComplete={mode === "email" ? "email" : "tel"} value={contact} required maxLength={mode === "email" ? 254 : 40} disabled={busy} onChange={event => { setContact(event.target.value); setChallenge(""); setMessage(""); }} />
        <button className={buttonClass} disabled={busy || !contact.trim()}>{busy ? "Veuillez patienter…" : challenge ? "Demander un nouveau code" : "Recevoir mon code"}</button>
      </form>
      {challenge && <form className="mt-6 border-t pt-5" onSubmit={event => { event.preventDefault(); void verifyCode(); }}>
        <p className="mb-4">{genericMessage}</p>
        <label htmlFor="candidate-code" className="mb-2 block font-bold">Code à 6 chiffres</label>
        <input id="candidate-code" className={inputClass} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} disabled={busy} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} required />
        <p className="mt-2 text-sm">Valable 10 minutes, une seule utilisation et 5 essais maximum. Un code incorrect, expiré ou épuisé nécessite une nouvelle demande.</p>
        <button className={buttonClass} disabled={busy || code.length !== 6}>Ouvrir mon dossier</button>
      </form>}
      <p className="mt-5 text-sm">Code non reçu, trop de demandes, plusieurs achats ou besoin d’aide ? Vérifiez vos courriers indésirables, patientez 10 minutes ou <a className="underline" href="mailto:contact@tahiti-trip.com">contactez l’administration</a>.</p>
    </section> : <section className="rounded-2xl bg-green-100 p-5 text-green-950 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-bold">Mon dossier Permis</h2><button className="underline" disabled={busy} onClick={() => void run(async () => { await api("session", { method: "DELETE" }); setRow(null); setPatch({}); setDocuments({}); setMessage("Session fermée."); })}>Fermer ma session</button></div>
      <p className="mt-4 font-bold">{row.prenom} {row.nom}{(row.prenom2 || row.nom2) && <> / {row.prenom2} {row.nom2}</>}</p>
      <p>Formule : {row.formule}</p><p>Statut administratif : {row.statut || "Non renseigné"}</p>
      <div className="my-5 rounded-xl bg-white p-4"><p>Examen : {afficherDatePermis(row.examen)}</p><p>Cours : {afficherDatePermis(row.date_cours)} — {row.creneau || "Créneau à choisir"}</p></div>
      <fieldset disabled={busy}>
        <label className="mb-2 block font-bold" htmlFor="candidate-exam">Date d’examen</label>
        <select id="candidate-exam" className={inputClass} value={current.examen || ""} onChange={event => setPatch(value => ({ ...value, examen: event.target.value || null }))}>
          <option value="">Je choisirai plus tard</option>
          {current.examen && !availability?.exams.includes(current.examen) && <option value={current.examen}>{afficherDatePermis(current.examen)} (choix actuel)</option>}
          {availability?.exams.map(exam => <option key={exam} value={exam}>{afficherDatePermis(exam)}</option>)}
        </select>
        {availability && !availability.exams.length && <p className="mt-2">Aucune session disponible actuellement. Contactez l’administration.</p>}
        <div className="mt-6 rounded-2xl bg-white p-4 text-slate-900"><h3 className="mb-4 text-xl font-bold">Choisir mon cours pratique</h3>
          <Calendar locale="fr-FR" className="!w-full !border-none" minDate={getTahitiTodayAsLocalDate()} value={day ? new Date(day + "T12:00:00") : null} onChange={value => { const date = value as Date; const iso = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; setPatch(previous => ({ ...previous, date_cours: iso, creneau: null })); }} />
          <p className="mt-3">{afficherDatePermis(current.date_cours)}</p>
          <button type="button" className="mt-2 underline" onClick={() => setPatch(value => ({ ...value, date_cours: null, creneau: null }))}>Choisir le cours plus tard</button>
        </div>
        <label htmlFor="candidate-slot" className="mb-2 mt-4 block font-bold">Créneau horaire</label>
        <select id="candidate-slot" className={inputClass} disabled={!day || !availability} value={current.creneau || ""} onChange={event => setPatch(value => ({ ...value, creneau: event.target.value || null }))}>
          <option value="">Choisir un créneau</option>
          {current.creneau && !availability?.slots.includes(current.creneau) && <option value={current.creneau}>{current.creneau} (choix actuel)</option>}
          {availability?.slots.map(slot => <option key={slot}>{slot}</option>)}
        </select>
        {!availability && !availabilityError && <p className="mt-2">Chargement des disponibilités…</p>}
        {availabilityError && <p role="alert" className="mt-2 text-red-800">{availabilityError}</p>}
        {day && availability && !availability.slots.length && <p className="mt-2">Aucun créneau disponible pour cette date.</p>}
        <button className={buttonClass} disabled={!!current.date_cours !== !!current.creneau} onClick={() => void save()}>Enregistrer mes dates</button>
      </fieldset>
      <button className="mt-3 underline" disabled={busy} onClick={() => void run(load)}>Recharger le dossier et les disponibilités</button>
      <section className="mt-6 rounded-xl bg-white p-4 text-slate-900"><h3 className="text-xl font-bold">Déposer mes documents</h3>
        <p className="my-3 rounded-xl bg-yellow-50 p-3">Sans dépôt complet au moins 8 jours avant l’examen, l’inscription ne peut pas être garantie.</p>
        <p>Pièces déposées : {Object.values(row.documents).filter(Boolean).length}/4</p>
        <ul className="mt-2 text-sm">{Object.entries(row.documents).map(([kind, present]) => <li key={kind}>{({ certificat: "Certificat", formulaire: "Formulaire", photo: "Photo", identite: "Pièce d’identité" })[kind as DocumentKind]} : {present ? "déposé" : "à déposer"}</li>)}</ul>
        <p className="mt-3 text-sm">Maximum 3 Mo par fichier. PDF pour les pièces, JPEG pour la photo.</p>
        <fieldset disabled={busy}><UploadDocuments key={uploadKey} onFilesChange={setDocuments} /><button className={buttonClass} onClick={() => void upload()}>Déposer mes documents</button></fieldset>
      </section>
    </section>}
    {message && <p role="status" className="mt-4 rounded-xl bg-green-100 p-4 text-green-950">{message}</p>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-100 p-4 text-red-900">{error}</p>}
  </div></main>;
}
