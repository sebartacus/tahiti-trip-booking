"use client";
import { useEffect, useMemo, useState } from "react";
import { ACTIVITY_LABELS, EMPLOYEE_ACTIVITIES, eventOnDay, monthBounds, planningEvents, type EmployeeActivity, type OperationalRow, type PlanningEvent } from "@/lib/employeePlanning";

const colors: Record<EmployeeActivity, string> = {
  permis: "border-amber-300 bg-amber-50 text-amber-950", baleines: "border-sky-200 bg-sky-50 text-sky-950",
  peche: "border-emerald-200 bg-emerald-50 text-emerald-950", "peche-nuit": "border-violet-200 bg-violet-50 text-violet-950", charter: "border-rose-200 bg-rose-50 text-rose-950",
};
const dots: Record<EmployeeActivity, string> = { permis: "bg-amber-500", baleines: "bg-sky-500", peche: "bg-emerald-500", "peche-nuit": "bg-violet-500", charter: "bg-rose-500" };
function formatDay(day: string, full = false) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", ...(full ? { weekday: "long" as const } : {}), timeZone: "UTC" }).format(new Date(day + "T12:00:00Z"));
}
function sortEvents(a: PlanningEvent, b: PlanningEvent) {
  return Number(b.activity === "permis") - Number(a.activity === "permis") || a.time.localeCompare(b.time) || a.title.localeCompare(b.title);
}
type ActivityResult = { events: PlanningEvent[]; error: string };
type LoadedMonth = { month: string; results: Partial<Record<EmployeeActivity, ActivityResult>> };

export default function PlanningEquipe({ today }: { today: string }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [filter, setFilter] = useState<EmployeeActivity | "all">("all");
  const [loaded, setLoaded] = useState<LoadedMonth>({ month: "", results: {} });
  const [revision, setRevision] = useState(0);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const bounds = monthBounds(month)!;
  const results = loaded.month === month ? loaded.results : {};
  const loading = loaded.month !== month;
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = Number(bounds.to.slice(-2));
  const offset = (new Date(bounds.from + "T12:00:00Z").getUTCDay() + 6) % 7;
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(bounds.from + "T12:00:00Z"));
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const bounds = monthBounds(month)!;
      const pairs = await Promise.all(EMPLOYEE_ACTIVITIES.map(async activity => {
        try {
          const response = await fetch(`/api/planning-equipe/${activity}?month=${month}`, { cache: "no-store", signal: controller.signal });
          if (response.status === 401) { window.location.replace("/planning-equipe/connexion"); throw new Error("Session expirée."); }
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || "Chargement impossible.");
          const events = (payload.reservations as OperationalRow[]).flatMap(row => planningEvents(activity, row)).filter(event => event.start <= bounds.to && event.end >= bounds.from);
          return [activity, { events, error: "" }] as const;
        } catch (error) {
          return [activity, { events: [], error: error instanceof Error ? error.message : "Chargement impossible." }] as const;
        }
      }));
      if (!controller.signal.aborted) setLoaded({ month, results: Object.fromEntries(pairs) });
    }
    void load();
    return () => controller.abort();
  }, [month, revision]);
  const allEvents = useMemo(() => loaded.month === month ? EMPLOYEE_ACTIVITIES.flatMap(activity => loaded.results[activity]?.events || []) : [], [loaded, month]);
  const visibleEvents = allEvents.filter(event => filter === "all" || event.activity === filter);
  const selectedEvents = visibleEvents.filter(event => eventOnDay(event, selected)).sort(sortEvents);
  const nextCourse = allEvents.filter(event => event.activity === "permis" && !event.isExam && event.start >= today).sort((a, b) => a.start.localeCompare(b.start) || a.time.localeCompare(b.time))[0];
  const errors = EMPLOYEE_ACTIVITIES.filter(activity => (filter === "all" || activity === filter) && results[activity]?.error);
  const dayCounts = Array.from({ length: daysInMonth }, (_, index) => {
    const day = `${month}-${String(index + 1).padStart(2, "0")}`;
    return { day, events: visibleEvents.filter(event => eventOnDay(event, day)) };
  });
  function navigate(delta: number) {
    const next = new Date(Date.UTC(year, monthNumber - 1 + delta, 1)).toISOString().slice(0, 7);
    setMonth(next); setSelected(next === today.slice(0, 7) ? today : next + "-01");
  }
  async function logout() {
    setLoggingOut(true); setLogoutError("");
    try {
      const response = await fetch("/api/planning-equipe/session", { method: "DELETE" });
      if (!response.ok) throw new Error();
      window.location.replace("/planning-equipe/connexion");
    } catch { setLogoutError("Déconnexion impossible. Réessayez."); setLoggingOut(false); }
  }
  return <main className="min-h-screen bg-[#f3f6f5] px-3 py-5 text-slate-900 sm:px-6 sm:py-8">
    <div className="mx-auto max-w-6xl">
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">Tahiti Trip · Équipe</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Votre planning</h1><p className="mt-2 text-sm text-slate-600">Cours, sorties et séjours · Heure de Tahiti</p></div>
        <button onClick={() => void logout()} disabled={loggingOut} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold disabled:opacity-60">{loggingOut ? "Déconnexion…" : "Déconnexion"}</button>
      </header>
      {logoutError && <p role="alert" className="mb-4 text-red-700">{logoutError}</p>}
      <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Permis côtier · Cours pratiques</p>
        {loading ? <p className="mt-2 text-sm">Chargement des cours…</p> : results.permis?.error ? <p className="mt-2 text-sm">Les cours sont temporairement indisponibles.</p> : nextCourse ? <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Prochain cours du mois · {formatDay(nextCourse.start)}</h2><p className="mt-1 text-sm">{nextCourse.time || "Horaire à préciser"} · {nextCourse.names.join(" et ") || "Identité à préciser"}</p></div><button onClick={() => { setSelected(nextCourse.start); setFilter("permis"); }} className="min-h-11 rounded-xl bg-amber-900 px-4 text-sm font-semibold text-white">Voir le cours</button></div> : <p className="mt-2 text-sm">Aucun cours à venir sur le mois affiché.</p>}
      </section>
      <nav aria-label="Filtrer par activité" className="mb-5 flex flex-wrap gap-2">
        {(["all", ...EMPLOYEE_ACTIVITIES] as const).map(activity => <button key={activity} onClick={() => setFilter(activity)} aria-pressed={filter === activity} className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition ${filter === activity ? "border-teal-900 bg-teal-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{activity === "all" ? "Tous" : ACTIVITY_LABELS[activity]}</button>)}
      </nav>
      {!!errors.length && <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><p className="font-semibold">Planning incomplet</p>{errors.map(activity => <p key={activity} className="mt-1">{ACTIVITY_LABELS[activity]} : {results[activity]?.error}</p>)}<button onClick={() => { setLoaded({ month: "", results: {} }); setRevision(value => value + 1); }} className="mt-3 min-h-11 rounded-xl border border-red-300 bg-white px-4 font-semibold">Réessayer</button></div>}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-label="Calendrier mensuel" aria-busy={loading} className="min-w-0 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-2">
            <button onClick={() => navigate(-1)} aria-label="Mois précédent" className="min-h-11 min-w-11 rounded-xl bg-slate-100 text-xl">‹</button>
            <h2 className="text-center text-lg font-semibold capitalize">{monthLabel}</h2>
            <button onClick={() => navigate(1)} aria-label="Mois suivant" className="min-h-11 min-w-11 rounded-xl bg-slate-100 text-xl">›</button>
          </div>
          <button onClick={() => { setMonth(today.slice(0, 7)); setSelected(today); }} className="mb-4 min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold">Aujourd’hui</button>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(day => <span key={day} className="pb-2 text-center text-[11px] font-semibold text-slate-500">{day}</span>)}
            {Array.from({ length: offset }, (_, index) => <span key={"empty-" + index} />)}
            {dayCounts.map(({ day, events }, index) => <button key={day} onClick={() => setSelected(day)} aria-label={`${formatDay(day, true)}, ${events.length} événement${events.length !== 1 ? "s" : ""}`} aria-pressed={selected === day} aria-current={day === today ? "date" : undefined} className={`flex min-h-[78px] min-w-0 flex-col items-center gap-1 rounded-xl border px-0.5 py-2 text-sm sm:min-h-[92px] ${selected === day ? "border-teal-800 bg-teal-50 ring-1 ring-teal-800" : "border-slate-100 hover:bg-slate-50"} ${day < today ? "text-slate-500" : "text-slate-900"}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${day === today ? "bg-teal-900 font-bold text-white" : "font-semibold"}`}>{index + 1}</span>
              <span className="flex max-w-full flex-wrap justify-center gap-0.5" aria-hidden="true">{EMPLOYEE_ACTIVITIES.filter(activity => events.some(event => event.activity === activity)).map(activity => <span key={activity} className={`h-1.5 w-1.5 rounded-full ${dots[activity]}`} />)}</span>
              {!!events.length && <span className="text-[10px] font-medium">{events.length} <span className="hidden sm:inline">évén.</span></span>}
            </button>)}
          </div>
          <p className="mt-4 text-xs text-slate-500">Sélectionnez un jour pour consulter les détails.</p>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-[11px] text-slate-600">{EMPLOYEE_ACTIVITIES.map(activity => <span key={activity} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${dots[activity]}`} />{ACTIVITY_LABELS[activity]}</span>)}</div>
        </section>
        <section aria-label="Détail de la journée" aria-live="polite" className="min-w-0">
          <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-teal-700">La journée</p><h2 className="mt-1 text-xl font-semibold capitalize">{formatDay(selected, true)}</h2></div><span className="rounded-full bg-white px-3 py-2 text-xs font-semibold">{selectedEvents.length} événement{selectedEvents.length !== 1 ? "s" : ""}</span></div>
          {loading ? <p role="status" className="rounded-2xl bg-white p-5 text-sm text-slate-600">Chargement du planning…</p> : !selectedEvents.length ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">{errors.length ? "Les données disponibles ne contiennent aucun événement pour cette journée. Certaines activités n’ont pas pu être chargées." : "Aucun événement pour cette journée et ce filtre."}</p> : <div className="space-y-3">{selectedEvents.map((event, index) => <EventCard key={event.activity + index} event={event} />)}</div>}
        </section>
      </div>
      <footer className="mt-8 text-center text-xs text-slate-500">Planning équipe · Consultation uniquement</footer>
    </div>
  </main>;
}
function EventCard({ event }: { event: PlanningEvent }) {
  const phone = event.phone.replace(/[^+\d]/g, "");
  return <article className={`min-w-0 rounded-2xl border p-5 ${event.isExam ? "border-orange-400 bg-orange-100 text-orange-950" : colors[event.activity]}`}>
    <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] font-bold uppercase tracking-wider">{ACTIVITY_LABELS[event.activity]}</span><span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold">{event.people === null ? "Effectif à préciser" : `${event.people} personne${event.people > 1 ? "s" : ""}`}</span></div>
    <h3 className="mt-3 text-lg font-semibold">{event.title}</h3>
    {event.time && <p className="mt-1 text-lg font-bold">{event.time}</p>}
    {event.activity === "permis" && !event.time && <p className="mt-1 text-sm">Horaire à préciser</p>}
    {event.activity === "charter" && <p className="mt-2 text-sm">{formatDay(event.start)} → {formatDay(event.end)}</p>}
    <div className="mt-4 border-t border-current/10 pt-3"><p className="text-xs opacity-75">{event.activity === "permis" ? "Candidats" : "Responsable"}</p>{event.names.length ? event.names.map((name, index) => <p key={index} className="mt-1 break-words font-semibold">{name}</p>) : <p className="mt-1 text-sm">Identité à préciser</p>}</div>
    {event.detail && <p className="mt-3 text-sm">{event.detail}</p>}
    {event.activity === "permis" && <p className="mt-3 text-sm">Examen : {event.exam ? formatDay(event.exam) : "À choisir"}</p>}
    {phone && /\d/.test(phone) ? <a href={`tel:${phone}`} className="mt-4 flex min-h-11 items-center justify-center rounded-xl border border-current/20 bg-white/70 px-3 text-sm font-semibold">Appeler · {event.phone}</a> : <p className="mt-4 text-xs opacity-75">Téléphone non renseigné</p>}
  </article>;
}
