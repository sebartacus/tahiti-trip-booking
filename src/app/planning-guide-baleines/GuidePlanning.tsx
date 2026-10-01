"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MISSING, groupGuideDepartures, guideDateLabel, guideMonthBounds, shiftGuideMonth,
  type GuideReservation,
} from "@/lib/guideBaleines";
import GuideDepartureDetail from "./GuideDepartureDetail";
import styles from "./guide.module.css";

type Loaded = { month: string; revision: number; rows: GuideReservation[]; error: string };
export default function GuidePlanning({ today }: { today: string }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDay, setSelectedDay] = useState(today);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState<Loaded>({ month: "", revision: -1, rows: [], error: "" });
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const detailRef = useRef<HTMLElement>(null);
  const current = loaded.month === month && loaded.revision === revision;
  const loading = !current;
  const error = current ? loaded.error : "";
  const departures = useMemo(() => current ? groupGuideDepartures(loaded.rows) : [], [current, loaded.rows]);
  const selectedDepartures = departures.filter(departure => departure.date === selectedDay);
  const selectedDeparture = selectedDepartures.find(departure => departure.depart === selectedTime);
  const bounds = guideMonthBounds(month)!;
  const [year, monthNumber] = month.split("-").map(Number);
  const offset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = Number(bounds.to.slice(-2));
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(month + "-01T12:00:00Z"));

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/planning-guide-baleines?month=" + month, { cache: "no-store", signal: controller.signal });
        if (response.status === 401) { window.location.replace("/planning-guide-baleines/connexion"); return; }
        if (!response.ok) throw new Error("Impossible de charger les sorties. Réessayez.");
        const payload = await response.json();
        if (!Array.isArray(payload.reservations)) throw new Error("Réponse du planning invalide.");
        if (!controller.signal.aborted) setLoaded({ month, revision, rows: payload.reservations, error: "" });
      } catch (cause) {
        if (!controller.signal.aborted) setLoaded({
          month, revision, rows: [], error: cause instanceof Error ? cause.message : "Chargement impossible.",
        });
      }
    }
    void load();
    return () => controller.abort();
  }, [month, revision]);
  useEffect(() => {
    if (selectedTime) {
      detailRef.current?.focus({ preventScroll: true });
      detailRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    }
  }, [selectedDay, selectedTime]);
  function navigate(delta: number) {
    const next = shiftGuideMonth(month, delta);
    setMonth(next); setSelectedDay(next === today.slice(0, 7) ? today : next + "-01"); setSelectedTime(null);
  }
  async function logout() {
    setLoggingOut(true); setLogoutError("");
    try {
      const response = await fetch("/api/planning-guide-baleines/session", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setLoaded({ month: "", revision: -1, rows: [], error: "" });
      window.location.replace("/planning-guide-baleines/connexion");
    } catch { setLogoutError("Déconnexion impossible. Réessayez."); setLoggingOut(false); }
  }
  return <main className={styles.page}>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div><p className={styles.eyebrow}>Tahiti Trip · Guide Baleines</p><h1>Les sorties à venir.</h1>
          <p className={styles.headerSubtitle}>Clients & matériel · Heure de Tahiti</p></div>
        <button type="button" className={styles.logout} onClick={() => void logout()} disabled={loggingOut}>
          {loggingOut ? "Déconnexion…" : "Déconnexion"}
        </button>
      </div>
    </header>
    <div className={styles.content}>
      {logoutError && <p role="alert" className={styles.error}>{logoutError}</p>}
      <div className={styles.toolbar}>
        <p>Votre planning de mise à l’eau</p>
        <button type="button" className={styles.textButton} disabled={loading}
          onClick={() => { setRevision(value => value + 1); setSelectedTime(null); }}>Actualiser</button>
      </div>
      <div className={styles.planningGrid}>
        <section className={styles.calendar} aria-label="Calendrier des sorties Baleines" aria-busy={loading}>
          <div className={styles.monthNav}>
            <button type="button" className={styles.arrowButton} aria-label="Mois précédent" onClick={() => navigate(-1)}>‹</button>
            <h2>{monthLabel}</h2>
            <button type="button" className={styles.arrowButton} aria-label="Mois suivant" onClick={() => navigate(1)}>›</button>
          </div>
          <div className={styles.calendarTopline}>
            <span>{loading ? "Chargement…" : error ? "Planning indisponible" : departures.length + " départs à venir"}</span>
            <button type="button" className={styles.textButton} onClick={() => {
              setMonth(today.slice(0, 7)); setSelectedDay(today); setSelectedTime(null);
            }}>Aujourd’hui</button>
          </div>
          <div className={styles.calendarGrid}>
            {["L", "M", "M", "J", "V", "S", "D"].map((label, index) => <span className={styles.weekday} key={index}>{label}</span>)}
            {Array.from({ length: offset }, (_, index) => <span key={"blank-" + index} />)}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = month + "-" + String(index + 1).padStart(2, "0");
              const dayDepartures = departures.filter(departure => departure.date === day);
              const isSelected = day === selectedDay;
              return <button key={day} type="button" aria-pressed={isSelected}
                disabled={day < today || loading || Boolean(error)}
                aria-label={guideDateLabel(day) + " · " + dayDepartures.length + " départs"}
                className={[styles.day, isSelected ? styles.selectedDay : "", dayDepartures.length ? styles.hasDepartures : ""].join(" ")}
                onClick={() => { setSelectedDay(day); setSelectedTime(null); }}>
                <span className={styles.dayNumber}>{index + 1}{day === today && <span className={styles.todayDot} />}</span>
                {dayDepartures.map(departure => <span className={styles.timeChip} key={departure.depart}>{departure.depart}</span>)}
              </button>;
            })}
          </div>
          <p className={styles.legend}><span /> Départs confirmés ou réservés manuellement</p>
        </section>
        <section className={styles.departures} aria-label="Départs du jour">
          <p className={styles.eyebrow}>Votre journée</p>
          <h2>{guideDateLabel(selectedDay)}</h2>
          {loading ? <p role="status" className={styles.empty}>Chargement des sorties…</p> : error ?
            <div role="alert" className={styles.error}><p>{error}</p><button type="button" className={styles.textButton} onClick={() => setRevision(value => value + 1)}>Réessayer</button></div> :
            selectedDepartures.length === 0 ? <p className={styles.empty}>Aucune sortie à venir pour cette journée.</p> :
            selectedDepartures.map(departure => <button type="button" key={departure.depart} className={styles.departureButton}
              aria-label={"Voir le départ de " + departure.depart} aria-pressed={selectedTime === departure.depart}
              onClick={() => setSelectedTime(departure.depart)}>
              <span className={styles.departureTime}>{departure.depart}<small>{departure.depart === "07:00" ? "Matin" : "Après-midi"}</small></span>
              <span className={styles.departureCounts}><span><strong>{departure.nageurs ?? MISSING}</strong> {departure.nageurs === 1 ? "nageur" : "nageurs"}</span>
                <span><strong>{departure.observateurs ?? MISSING}</strong> {departure.observateurs === 1 ? "observateur" : "observateurs"}</span>
                <span className={styles.detailLink}>Clients & matériel →</span></span>
            </button>)}
        </section>
      </div>
      {selectedDeparture && <section ref={detailRef} tabIndex={-1} aria-labelledby="guide-detail-title" className={styles.detail}>
        <GuideDepartureDetail departure={selectedDeparture} />
      </section>}
      <footer className={styles.footer}>Guide Baleines · Consultation uniquement</footer>
    </div>
  </main>;
}
