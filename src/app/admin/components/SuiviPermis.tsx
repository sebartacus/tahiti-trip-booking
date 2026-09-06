"use client";

import { useState } from "react";
import { getTahitiToday } from "@/lib/tahiti-date";
import { afficherDatePermis, candidatsPermis, compteursPermis, correspondFiltre, datePermis, groupesPermis, originePermis, piecesPermis, rechercherPermis, sansExamen, type FiltrePermis, type PermisDossier } from "@/lib/permisPlanning";

const labels: Record<FiltrePermis,string> = {sansDates:"Sans dates",sansExamen:"Sans examen",sansCours:"Sans cours",incomplets:"Dossiers incomplets"};

function Dossier({row}: {row:PermisDossier}) {
  return <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
    <p className="break-words font-bold">{candidatsPermis(row).join(" · ")}</p>
    <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
      <div><dt className="text-slate-500">Téléphone</dt><dd>{row.telephone || "Non renseigné"}</dd></div>
      <div><dt className="text-slate-500">Origine</dt><dd>{originePermis(row.origine_reservation)}</dd></div>
      <div><dt className="text-slate-500">Examen</dt><dd>{afficherDatePermis(row.examen)}</dd></div>
      <div><dt className="text-slate-500">Cours pratique</dt><dd>{afficherDatePermis(row.date_cours)} · {row.creneau || "Créneau à choisir"}</dd></div>
      <div><dt className="text-slate-500">Pièces déposées (dossier)</dt><dd>{piecesPermis(row)}/4</dd></div>
      <div><dt className="text-slate-500">Statut administratif</dt><dd>{row.statut || "Non renseigné"}</dd></div>
    </dl>
  </article>;
}
export default function SuiviPermis({reservations}: {reservations:PermisDossier[]}) {
  const [query,setQuery] = useState("");
  const [filter,setFilter] = useState<FiltrePermis | null>(null);
  const active = reservations.filter(row => !row.archived);
  const counts = compteursPermis(active);
  const rows = active.filter(row => rechercherPermis(row,query));
  const today = getTahitiToday();
  const exams = groupesPermis(rows,"examen",today);
  const courses = groupesPermis(rows,"cours",today);
  const invalid = rows.filter(row => (!sansExamen(row.examen) && !datePermis(row.examen)) || (row.date_cours?.trim() && !datePermis(row.date_cours)));
  const selected = rows.filter(row => correspondFiltre(row,filter || "sansDates"));
  return <section id="suivi-permis" aria-labelledby="suivi-permis-title" className="mb-8 scroll-mt-6 rounded-2xl border border-sky-200 bg-slate-50 p-4 text-slate-900 shadow sm:p-6">
    <h2 id="suivi-permis-title" className="text-2xl font-bold">Suivi Permis</h2>
    <p className="mt-1 text-sm text-slate-600">Dossiers actifs · Dates à partir d’aujourd’hui à Tahiti, journée incluse.</p>
    <div className="my-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {(Object.keys(labels) as FiltrePermis[]).map(key => <button key={key} type="button" aria-pressed={filter === key} aria-controls="suivi-permis-selection" onClick={() => setFilter(filter === key ? null : key)} className={`rounded-xl border p-4 text-left focus-visible:outline-2 focus-visible:outline-sky-700 ${filter === key ? "border-sky-800 bg-sky-800 text-white" : "border-slate-200 bg-white hover:bg-sky-50"}`}>
        <span className="block text-sm font-semibold">{labels[key]}</span><span className="mt-1 block text-2xl font-bold">{counts[key]}</span><span className="text-xs">{key === "incomplets" ? "dossiers" : "candidats"}</span>
      </button>)}
    </div>
    <label htmlFor="suivi-permis-search" className="block text-sm font-semibold">Rechercher un nom ou prénom</label>
    <input id="suivi-permis-search" type="search" value={query} onChange={event => setQuery(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 sm:max-w-md" placeholder="Candidat ou deuxième participant" />
    <p className="mt-2 text-xs text-slate-600">La recherche filtre les listes. Les compteurs restent globaux. Les pièces déposées ne constituent pas une validation administrative.</p>
    {filter && <div id="suivi-permis-selection" className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-xl font-bold">{labels[filter]} — résultats</h3><button type="button" onClick={() => setFilter(null)} className="rounded-lg border bg-white px-3 py-2 text-sm">Fermer le filtre</button></div>
      <div className="grid gap-3 xl:grid-cols-2">{selected.map(row => <Dossier key={row.id} row={row}/>)}</div>
      {!selected.length && <p>Aucun dossier correspondant</p>}
    </div>}
    <div className="mt-7"><h3 className="mb-3 text-xl font-bold">Prochains examens</h3>
      {!exams.length && <p className="rounded-xl bg-white p-4">Aucun examen à venir</p>}
      {exams.map(group => <div key={group.date} className="mb-4 rounded-xl border border-sky-100 bg-sky-50 p-3">
        <h4 className="mb-3 font-bold">{afficherDatePermis(group.date)} — {group.dossiers.reduce((n,row) => n+candidatsPermis(row).length,0)} candidats · {group.dossiers.length} dossiers</h4>
        <div className="grid gap-3 xl:grid-cols-2">{group.dossiers.map(row => <Dossier key={row.id} row={row}/>)}</div>
      </div>)}
    </div>
    <div className="mt-7"><h3 className="mb-3 text-xl font-bold">Prochains cours</h3>
      {!courses.length && <p className="rounded-xl bg-white p-4">Aucun cours à venir</p>}
      {courses.map(group => <div key={group.date+group.creneau} className="mb-4 rounded-xl border border-sky-100 bg-sky-50 p-3">
        <h4 className="mb-3 font-bold">{afficherDatePermis(group.date)} · {group.creneau || "Créneau non renseigné"}</h4>
        <div className="grid gap-3 xl:grid-cols-2">{group.dossiers.map(row => <Dossier key={row.id} row={row}/>)}</div>
      </div>)}
    </div>
    <div className="mt-7"><h3 className="mb-3 text-xl font-bold">Sans dates</h3>
      <div className="grid gap-3 xl:grid-cols-2">{rows.filter(row => correspondFiltre(row,"sansDates")).map(row => <Dossier key={row.id} row={row}/>)}</div>
      {!rows.some(row => correspondFiltre(row,"sansDates")) && <p className="rounded-xl bg-white p-4">Aucun dossier sans dates</p>}
    </div>
    {!!invalid.length && <div className="mt-7 rounded-xl border border-amber-300 bg-amber-50 p-4"><h3 className="font-bold">Dates à vérifier</h3><p className="mb-3 text-sm">Ces dates non reconnues sont exclues du planning concerné.</p><div className="grid gap-3 xl:grid-cols-2">{invalid.map(row => <Dossier key={row.id} row={row}/>)}</div></div>}
  </section>;
}
