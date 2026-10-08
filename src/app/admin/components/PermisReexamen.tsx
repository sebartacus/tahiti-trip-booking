"use client";

import { useEffect, useRef, useState } from "react";
import { afficherDatePermis, candidatsPermis, rechercherPermis, type PermisDossier } from "@/lib/permisPlanning";
import { permisReexamenProblem } from "@/lib/permisReexamen";
import { getTahitiToday } from "@/lib/tahiti-date";

export default function PermisReexamen({ reservations, onChanged }: {
  reservations: PermisDossier[];
  onChanged: (id: string | number, examen: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ id: string | number; participant: number } | null>(null);
  const [exams, setExams] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [exam, setExam] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refresh, setRefresh] = useState(0);
  const pending = useRef(false);
  const row = reservations.find(r => r.id === selected?.id);
  const problem = row ? permisReexamenProblem(row, getTahitiToday()) : null;
  const matches = query.trim() ? reservations.filter(r => rechercherPermis(r, query)).flatMap(r => candidatsPermis(r).map((name, participant) => ({ row: r, name, participant }))) : [];
  function resetCalendar() {
    setLoading(true); setExams([]); setExam(""); setWarnings([]); setError("");
  }

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/admin/permis/examens", { cache: "no-store", signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setExams(body.exams); setWarnings(body.warnings);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Impossible de charger les sessions.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [open, refresh]);

  async function confirm() {
    if (pending.current || !row || problem || !exam) return;
    pending.current = true; setSaving(true); setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/admin/permis/${encodeURIComponent(row.id)}/examen`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examen: exam, expectedExamen: row.examen }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      onChanged(row.id, body.examen);
      setSuccess(`${candidatsPermis(row)[0]} ajouté à l’examen du ${afficherDatePermis(body.examen)}. L’échec précédent est conservé.`);
      setOpen(false); setSelected(null); setQuery(""); setExam("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Impossible de confirmer. Rechargez le dossier avant de réessayer.");
    } finally { pending.current = false; setSaving(false); }
  }

  return <div className="mb-4">
    <button type="button" onClick={() => { if (!open) resetCalendar(); setOpen(!open); setSuccess(""); setError(""); setSelected(null); setQuery(""); }} disabled={saving} aria-expanded={open} aria-controls="permis-reexamen" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-sky-700">{open ? "Fermer" : "Ajouter un candidat"}</button>
    {success && <p role="status" className="mt-2 text-sm text-green-800">{success}</p>}
    {open && <div id="permis-reexamen" className="mt-3 rounded-xl border border-sky-200 bg-white p-4">
      <p className="mb-3 text-sm text-slate-600">Réinscrire un candidat après un examen raté, avec son dossier existant.</p>
      <label htmlFor="permis-reexamen-search" className="block text-sm font-semibold">Rechercher un candidat par nom ou prénom</label>
      <input id="permis-reexamen-search" type="search" value={query} disabled={saving} onChange={event => { setQuery(event.target.value); setSelected(null); setError(""); }} className="mt-2 w-full rounded-lg border border-slate-300 p-3" />
      {!!query.trim() && <ul className="my-3 max-h-64 space-y-2 overflow-y-auto">
        {matches.slice(0, 25).map(({ row: r, name, participant }) => <li key={`${r.id}-${participant}`}>
          <button type="button" disabled={saving} aria-pressed={selected?.id === r.id && selected.participant === participant} onClick={() => { setSelected({ id: r.id, participant }); setError(""); setExam(""); }} className="w-full rounded-lg border border-slate-200 p-3 text-left hover:bg-sky-50 aria-pressed:border-sky-700 aria-pressed:bg-sky-50 focus-visible:outline-2 focus-visible:outline-sky-700">
            <span className="font-semibold">{name}</span><span className="block text-xs text-slate-500">Dossier #{r.id} · Examen : {afficherDatePermis(r.examen)}{candidatsPermis(r).length > 1 ? " · Deux participants, réinscription individuelle indisponible" : ""}</span>
          </button>
        </li>)}
        {!matches.length && <li className="text-sm">Aucun candidat trouvé.</li>}
      </ul>}
      {matches.length > 25 && <p className="text-xs text-slate-500">25 résultats affichés. Précisez le nom ou prénom.</p>}
      {row && <div className="mt-3 border-t border-slate-200 pt-3">
        <p className="font-semibold">Candidat choisi : {candidatsPermis(row)[selected!.participant]}</p>
        <p className="mt-1 text-sm">Date d’examen actuelle : {afficherDatePermis(row.examen)}</p>
        {problem ? <p role="status" className="mt-2 text-sm text-amber-800">{problem}</p> : <>
          <label htmlFor="permis-reexamen-date" className="mt-3 block text-sm font-semibold">Nouvelle session</label>
          <select id="permis-reexamen-date" value={exam} onChange={event => setExam(event.target.value)} disabled={loading || saving} className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3">
            <option value="">{loading ? "Chargement…" : "Choisir un examen"}</option>
            {exams.map(day => <option key={day} value={day}>{afficherDatePermis(day)}</option>)}
          </select>
          {!loading && !exams.length && <p className="mt-2 text-sm">Aucune session disponible.</p>}
          <p className="mt-2 text-xs text-slate-600">La confirmation enregistre l’examen précédent comme un échec et remplace sa date par la session choisie.</p>
          <button type="button" disabled={!exam || loading || saving} aria-busy={saving} onClick={confirm} className="mt-3 rounded-lg bg-sky-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Enregistrement…" : "Ajouter à cet examen"}</button>
        </>}
      </div>}
      {warnings.map(warning => <p key={warning} role="status" className="mt-3 text-sm text-amber-800">{warning}</p>)}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <button type="button" disabled={loading || saving} onClick={() => { resetCalendar(); setRefresh(r => r + 1); }} className="mt-3 text-xs text-slate-600 underline">Actualiser les sessions</button>
    </div>}
  </div>;
}
