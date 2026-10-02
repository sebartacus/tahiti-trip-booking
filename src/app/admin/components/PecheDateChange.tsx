"use client";

import { useState } from "react";
type Reservation = {
  id: string; date_sortie: string | null; formule: string | null;
  slots: string[] | null; facture_numero: string | null;
};
export default function PecheDateChange({ reservation, onChanged }: {
  reservation: Reservation; onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [checked, setChecked] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const labels: Record<string,string> = { morning: "Matin", afternoon: "Après-midi", full_day: "Journée complète" };
  async function submit(confirm: boolean) {
    setBusy(true); setMessage("");
    const body = { reservationId: reservation.id, expectedDate: reservation.date_sortie || "", date };
    try {
      const response = await fetch(confirm ? "/api/admin/peche/change-date" :
        "/api/admin/peche/change-date?" + new URLSearchParams(body), confirm ? {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        } : { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        setChecked("");
        if (payload.uncertain) await onChanged();
        throw new Error(payload.error || "Impossible de changer la date.");
      }
      if (confirm) {
        setChecked(""); setOpen(false);
        setMessage(payload.invoiceNumber ? "Date modifiée et facture de remplacement créée. Aucun email envoyé." : "Date modifiée.");
        await onChanged();
      } else { setChecked(date); setMessage("Créneaux disponibles. Vous pouvez confirmer."); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Connexion interrompue. Rechargez la réservation pour vérifier sa date."); }
    finally { setBusy(false); }
  }
  return <div className="mt-2">
    <button type="button" disabled={busy} className="cursor-pointer rounded bg-cyan-800 px-3 py-1 font-bold text-white disabled:opacity-50"
      onClick={() => { setOpen(!open); setChecked(""); setMessage(""); }}>Changer la date</button>
    {open && <div className="mt-2 min-w-64 rounded border bg-white p-3 text-slate-900">
      <p>Date actuelle : {reservation.date_sortie}</p>
      <p>{labels[reservation.formule || ""] || reservation.formule} — {(reservation.slots || []).map(slot => labels[slot] || slot).join(" + ")}</p>
      <label className="mt-2 block">Nouvelle date
        <input aria-label="Nouvelle date Pêche" type="date" value={date} disabled={busy}
          onChange={event => { setDate(event.target.value); setChecked(""); setMessage(""); }}
          className="block rounded border p-2" />
      </label>
      {reservation.facture_numero && <p className="mt-2 text-sm">Une nouvelle facture annulera et remplacera la facture {reservation.facture_numero}. Aucun email ne sera envoyé.</p>}
      <button type="button" disabled={busy || !date || date === reservation.date_sortie}
        onClick={() => submit(checked === date)}
        className="mt-2 cursor-pointer rounded bg-cyan-800 px-3 py-2 text-white disabled:opacity-50">
        {busy ? "Vérification…" : checked === date ? "Confirmer le changement" : "Vérifier la disponibilité"}
      </button>
    </div>}
    {message && <p role="status" className="mt-2 max-w-sm text-sm">{message}</p>}
  </div>;
}
