"use client";

import { useRef, useState } from "react";

type Reservation = {
  id: string; facture_numero: string | null; facture_url: string | null;
  responsable_email: string | null;
};
export default function PecheSendInvoice({ reservation }: { reservation: Reservation }) {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  if (!reservation.facture_numero || !reservation.facture_url) return null;
  async function send() {
    if (pending.current || !window.confirm("Envoyer la facture actuelle " + reservation.facture_numero + " à " + (reservation.responsable_email || "l’email du client") + " ?")) return;
    pending.current = true;
    setBusy(true); setMessage(""); setFailed(false);
    try {
      const response = await fetch("/api/admin/peche/send-invoice", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: reservation.id }),
      });
      const payload = await response.json();
      if (!response.ok || payload.ok !== true) throw new Error(payload.error || "Impossible d’envoyer la facture.");
      setMessage("Facture envoyée avec succès à " + payload.email);
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Connexion interrompue pendant l’envoi de la facture.");
    } finally { pending.current = false; setBusy(false); }
  }
  return <div className="mt-2">
    <button type="button" disabled={busy} onClick={send}
      className="cursor-pointer rounded bg-cyan-800 px-3 py-1 text-white disabled:opacity-50">
      {busy ? "Envoi en cours…" : "Envoyer la facture"}
    </button>
    {message && <p role={failed ? "alert" : "status"} className="mt-2 max-w-sm text-sm">{message}</p>}
  </div>;
}
