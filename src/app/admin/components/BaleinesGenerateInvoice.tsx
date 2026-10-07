"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  reservation: {
    id: string; paye: boolean | null; statut_paiement: string | null;
    facture_numero: string | null; facture_url: string | null; email_sent: boolean | null;
  };
  onSuccess: () => Promise<void>;
};
export default function BaleinesGenerateInvoice({ reservation, onSuccess }: Props) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const paid = reservation.paye === true && ["paid", "paye"].includes(reservation.statut_paiement || "");
  const absent = !reservation.facture_numero && !reservation.facture_url;
  useEffect(() => {
    if (!paid || absent || reservation.email_sent) return;
    let active = true;
    fetch("/api/admin/baleines/generate-invoice?reservationId=" + encodeURIComponent(reservation.id), { cache: "no-store" })
      .then(async response => response.ok ? response.json() : null)
      .then(status => { if (active && status?.retryable) setRetry(true); })
      .catch(() => { /* The invoice remains available; no automatic delivery. */ });
    return () => { active = false; };
  }, [paid, absent, reservation.id, reservation.email_sent]);
  if (!paid || sent || reservation.email_sent || (!absent && !retry)) return null;
  async function generate() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/baleines/generate-invoice", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: reservation.id }),
      });
      const payload = await response.json();
      if (!response.ok) { setRetry(true); throw new Error(payload.error || "Impossible de générer et envoyer la facture."); }
      setSent(true);
      await onSuccess();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Action impossible."); }
    finally { lock.current = false; setBusy(false); }
  }
  return (
    <div className="mt-2">
      <button type="button" disabled={busy} onClick={generate}
        className="rounded bg-sky-700 px-3 py-1 text-white disabled:opacity-60">
        {busy ? "Traitement…" : retry ? "Réessayer l’envoi de la facture" : "Générer et envoyer la facture"}
      </button>
      {error && <p role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
