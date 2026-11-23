"use client";

import { FormEvent, useEffect, useState } from "react";
import type { PermisBlock } from "@/lib/permisUnavailability";

const endpoint = "/api/admin/permis/indisponibilites";
const inputClass = "w-full rounded-xl border border-slate-300 p-3";
const dateLabel = (day: string) => day.split("-").reverse().join("/");
const timeLabel = (minute: number) => [
  Math.floor(minute / 60), minute % 60,
].map(value => String(value).padStart(2, "0")).join(":");

async function requestBlocks(url: string, options?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Impossible de gérer les indisponibilités.");
  return data;
}

export default function PermisUnavailability() {
  const [mode, setMode] = useState("horaire");
  const [blocks, setBlocks] = useState<PermisBlock[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    requestBlocks(endpoint, { signal: controller.signal })
      .then(data => setBlocks(data.blocages))
      .catch(() => {
        if (!controller.signal.aborted) setError("Impossible de charger les indisponibilités.");
      });
    return () => controller.abort();
  }, []);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { blocage, conflits } = await requestBlocks(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setBlocks(current => [blocage, ...(current ?? [])]);
      setWarning(conflits > 0);
      setNotice(conflits > 0
        ? `Blocage enregistré. ${conflits} réservation(s) existante(s) sur la période. Elles sont conservées.`
        : "Blocage enregistré.");
      form.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d’enregistrer le blocage.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await requestBlocks(`${endpoint}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setBlocks(current => current?.filter(block => block.id !== id) ?? []);
      setWarning(false);
      setNotice("Blocage supprimé.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de supprimer le blocage.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-6 rounded-2xl bg-white p-4 shadow md:p-6">
      <h2 className="mb-2 text-2xl font-bold">Gestion des indisponibilités</h2>
      <p className="mb-4 text-sm text-slate-600">Cours pratiques · heure de Tahiti</p>
      <form onSubmit={add}>
        <fieldset disabled={busy || blocks === null} className="grid items-end gap-3 md:grid-cols-3">
          <label>Type de blocage
            <select name="mode" value={mode} onChange={event => setMode(event.target.value)} className={inputClass}>
              <option value="horaire">Créneau horaire</option>
              <option value="journee">Journée entière</option>
              <option value="periode">Plusieurs journées</option>
            </select>
          </label>
          <label>{mode === "periode" ? "Première journée" : "Date"}
            <input name="dateDebut" type="date" required className={inputClass} />
          </label>
          {mode === "periode" && (
            <label>Dernière journée incluse
              <input name="dateFin" type="date" required className={inputClass} />
            </label>
          )}
          {mode === "horaire" && (
            <>
              <label>Heure de début<input name="heureDebut" type="time" required className={inputClass} /></label>
              <label>Heure de fin<input name="heureFin" type="time" required className={inputClass} /></label>
            </>
          )}
          <label>Motif facultatif<input name="motif" maxLength={500} className={inputClass} /></label>
          <button className="rounded-xl bg-red-700 p-3 font-bold text-white disabled:opacity-50">Bloquer</button>
        </fieldset>
      </form>
      {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
      {notice && (
        <p role={warning ? "alert" : "status"} className={`mt-3 rounded-xl p-3 ${warning ? "bg-amber-100 text-amber-950" : "bg-green-100 text-green-950"}`}>
          {notice}
        </p>
      )}
      {blocks?.length === 0 && <p className="mt-4 text-slate-600">Aucune indisponibilité enregistrée.</p>}
      {!!blocks?.length && (
        <ul className="mt-4 space-y-2">
          {blocks.map(block => (
            <li key={block.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 p-3">
              <div>
                <p className="font-bold">
                  {dateLabel(block.date_debut)}
                  {block.date_fin !== block.date_debut && ` au ${dateLabel(block.date_fin)}`}
                  {block.debut_minute !== null && block.fin_minute !== null
                    ? ` · ${timeLabel(block.debut_minute)}–${timeLabel(block.fin_minute)}`
                    : " · Journée entière"}
                </p>
                {block.motif && <p className="break-all text-sm text-slate-700">{block.motif}</p>}
              </div>
              <button type="button" disabled={busy} onClick={() => remove(block.id)} className="rounded-xl bg-slate-700 px-4 py-2 text-white disabled:opacity-50">
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
