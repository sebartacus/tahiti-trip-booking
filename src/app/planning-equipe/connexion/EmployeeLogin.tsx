"use client";
import { useState, type FormEvent } from "react";

export default function EmployeeLogin() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/planning-equipe/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const payload = await response.json();
      if (!response.ok) { setError(payload.error || "Connexion impossible."); return; }
      window.location.replace("/planning-equipe");
    } catch { setError("Connexion impossible. Vérifiez votre connexion internet."); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#f3f6f5] px-5 py-12 text-slate-900">
    <section className="w-full max-w-md rounded-3xl border border-white bg-white p-7 shadow-xl shadow-slate-200/50 sm:p-10">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">Tahiti Trip · Équipe</p>
      <div className="my-7 h-1 w-12 rounded bg-teal-700" />
      <h1 className="text-3xl font-semibold tracking-tight">Le travail à venir.</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">Retrouvez les cours et les sorties de l’équipe dans votre planning.</p>
      <form onSubmit={login} className="mt-8 space-y-4">
        <label htmlFor="employee-password" className="block text-sm font-semibold">Mot de passe équipe</label>
        <input id="employee-password" type="password" autoComplete="current-password" required maxLength={1024} value={password} onChange={event => setPassword(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-offset-4 focus:outline-teal-700" />
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="min-h-12 w-full rounded-xl bg-teal-900 px-4 font-semibold text-white disabled:opacity-60">{busy ? "Connexion…" : "Ouvrir mon planning"}</button>
      </form>
      <p className="mt-6 text-center text-xs text-slate-500">Espace équipe · Consultation uniquement</p>
    </section>
  </main>;
}
