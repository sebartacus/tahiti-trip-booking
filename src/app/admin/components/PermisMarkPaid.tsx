"use client";

import { useRef, useState } from "react";
import { canMarkPermisPaid, type ManualPermisPaymentState } from "@/lib/permisAdmin";

export default function PermisMarkPaid({ reservation, onPaid }: {
  reservation: ManualPermisPaymentState & { id: number; pricing_amount: number | null };
  onPaid: () => Promise<void>;
}) {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!canMarkPermisPaid(reservation)) return null;
  async function markPaid() {
    if (running.current) return;
    if (!window.confirm(`Confirmez-vous avoir reçu ${Number(reservation.pricing_amount).toLocaleString("fr-FR")} F CFP pour ce candidat ? La facture sera générée.`)) return;
    running.current = true; setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/permis/${reservation.id}/mark-paid`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Impossible de marquer le permis comme payé.");
      await onPaid();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Connexion interrompue. Rechargez la liste avant de réessayer.");
    } finally { running.current = false; setBusy(false); }
  }
  return <div className="mb-2">
    <button type="button" disabled={busy} onClick={markPaid}
      className="cursor-pointer rounded bg-green-700 px-3 py-2 font-bold text-white disabled:opacity-50">
      {busy ? "Enregistrement…" : "Marquer comme payé"}
    </button>
    {error && <p role="alert" className="mt-2 max-w-sm text-sm text-red-700">{error}</p>}
  </div>;
}
