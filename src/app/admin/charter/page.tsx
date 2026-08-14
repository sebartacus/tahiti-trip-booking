"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAdminSession } from "@/hooks/useAdminSession";
import { CHARTER_FORMULAS, getCharterSlotRequirements, type CharterFormula } from "@/lib/charter-availability";
import { CHARTER_FORMULA_DETAILS, formatXpf, getCharterPrice } from "@/lib/charter-pricing";

type Reservation = {
  id: string; date_debut: string; date_fin: string; formule: CharterFormula;
  responsable_prenom: string; responsable_nom: string; responsable_tel: string;
  responsable_email: string | null; nombre_personnes: number; montant_total: number;
  montant_paye: number; montant_solde: number; type_paiement: string;
  statut_paiement: string; created_at: string; sunset_drink: string | null;
  champagne_supplement: boolean; reservation_manuelle: boolean;
};

type Form = {
  formule: CharterFormula; date_debut: string; responsable_prenom: string;
  responsable_nom: string; responsable_tel: string; responsable_email: string;
  nombre_personnes: number; type_paiement: string; statut_paiement: string;
  sunset_drink: string; champagne_supplement: boolean;
  sleeping_arrangement_accepted: boolean;
};

const initialForm: Form = {
  formule: "tetiaroa_2j_1n", date_debut: "", responsable_prenom: "",
  responsable_nom: "", responsable_tel: "", responsable_email: "",
  nombre_personnes: 2, type_paiement: "cash", statut_paiement: "unpaid",
  sunset_drink: "white_wine", champagne_supplement: false,
  sleeping_arrangement_accepted: false,
};

const paymentLabels: Record<string, string> = {
  cash: "Espèces", check: "Chèque", bank_transfer: "Virement",
  card_terminal: "Carte bancaire / TPE", deposit: "Acompte en ligne", full: "Paiement intégral en ligne",
};
const statusLabels: Record<string, string> = {
  unpaid: "Non payé", deposit_paid: "Acompte payé", paid: "Payé intégralement",
  pending: "Paiement en attente", paye: "Payé", failed: "Échec paiement", cancelled: "Annulé",
};

function formatDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split("-").reverse().join("/");
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function todayTahiti() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Pacific/Tahiti", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export default function AdminCharterPage() {
  const { authenticated, checking, logout } = useAdminSession();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [form, setForm] = useState<Form>(initialForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/charter", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setReservations(payload.reservations || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chargement impossible.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (authenticated) void Promise.resolve().then(load);
  }, [authenticated, load]);

  useEffect(() => {
    if (!form.date_debut) return;
    const controller = new AbortController();
    fetch(`/api/charter/availability?formule=${form.formule}&date_debut=${form.date_debut}`, { signal: controller.signal })
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        setAvailable(payload.available === true);
      })
      .catch(cause => {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) setAvailable(false);
      });
    return () => controller.abort();
  }, [form.date_debut, form.formule]);

  const amounts = useMemo(() => {
    try {
      const total = getCharterPrice(form.formule, form.nombre_personnes, form.champagne_supplement);
      const paid = form.statut_paiement === "unpaid" ? 0 : form.statut_paiement === "paid" ? total : Math.round(total * 0.3);
      return { total, paid, balance: total - paid };
    } catch { return { total: 0, paid: 0, balance: 0 }; }
  }, [form]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/charter", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setForm(initialForm); setOpen(false); setMessage("Réservation Charter créée et créneaux bateau réservés.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Création impossible.");
    } finally { setLoading(false); }
  }

  if (checking || !authenticated) return <main className="grid min-h-screen place-items-center bg-slate-50 font-bold text-cyan-950">Vérification de la session…</main>;

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-950 sm:p-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-black uppercase tracking-widest text-cyan-700">Administration</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Réservations Charter</h1></div>
          <nav className="flex flex-wrap gap-2">
            <Link href="/admin" className="rounded-full border bg-white px-4 py-2 text-sm font-black">Tableau de bord</Link>
            <Link href="/admin/bateau" className="rounded-full border bg-white px-4 py-2 text-sm font-black">Calendrier bateau</Link>
            <button onClick={() => void logout()} className="rounded-full border bg-white px-4 py-2 text-sm font-black">Déconnexion</button>
            <button onClick={() => { setOpen(true); setError(""); }} className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg">+ Nouvelle réservation Charter</button>
          </nav>
        </header>

        {message && <p className="mt-5 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">{message}</p>}
        {error && <p className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}

        <section className="mt-7 rounded-[28px] border bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between"><h2 className="text-xl font-black">{reservations.length} réservation(s)</h2>{loading && <span className="text-sm font-bold text-slate-500">Actualisation…</span>}</div>
          <div className="mt-5 hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1500px] text-left text-sm">
              <thead><tr className="border-b text-xs uppercase text-slate-500">{["Départ", "Retour", "Formule", "Responsable", "Téléphone", "Email", "Pers.", "Total", "Payé", "Solde", "Paiement", "Statut", "Créée le"].map(title => <th key={title} className="px-3 py-4 font-black">{title}</th>)}</tr></thead>
              <tbody>{reservations.map(r => <tr key={r.id} className="border-b last:border-0">
                <td className="px-3 py-4 font-bold">{formatDate(r.date_debut)}</td><td className="px-3 py-4">{formatDate(r.date_fin)}</td>
                <td className="px-3 py-4 font-bold text-cyan-900">{CHARTER_FORMULA_DETAILS[r.formule]?.label || r.formule}</td><td className="px-3 py-4">{r.responsable_prenom} {r.responsable_nom}</td>
                <td className="px-3 py-4">{r.responsable_tel}</td><td className="px-3 py-4">{r.responsable_email || "—"}</td><td className="px-3 py-4">{r.nombre_personnes}</td>
                <td className="px-3 py-4">{formatXpf(r.montant_total)}</td><td className="px-3 py-4 text-emerald-700">{formatXpf(r.montant_paye)}</td><td className="px-3 py-4 font-bold">{formatXpf(r.montant_solde)}</td>
                <td className="px-3 py-4">{paymentLabels[r.type_paiement] || r.type_paiement}</td><td className="px-3 py-4"><Status value={r.statut_paiement} /></td><td className="px-3 py-4">{formatDate(r.created_at)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="mt-5 grid gap-4 lg:hidden">{reservations.map(r => <article key={r.id} className="rounded-2xl border p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="font-black text-cyan-950">{CHARTER_FORMULA_DETAILS[r.formule]?.label}</p><p className="mt-1 text-sm font-bold">{formatDate(r.date_debut)} → {formatDate(r.date_fin)}</p></div><Status value={r.statut_paiement} /></div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><Data label="Responsable" value={`${r.responsable_prenom} ${r.responsable_nom}`} /><Data label="Personnes" value={r.nombre_personnes} /><Data label="Téléphone" value={r.responsable_tel} /><Data label="Email" value={r.responsable_email || "—"} /><Data label="Total" value={formatXpf(r.montant_total)} /><Data label="Payé / Solde" value={`${formatXpf(r.montant_paye)} / ${formatXpf(r.montant_solde)}`} /><Data label="Paiement" value={paymentLabels[r.type_paiement] || r.type_paiement} /><Data label="Créée le" value={formatDate(r.created_at)} /></dl>
          </article>)}</div>
          {!loading && reservations.length === 0 && <p className="py-12 text-center font-bold text-slate-500">Aucune réservation Charter.</p>}
        </section>
      </div>

      {open && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-3 sm:p-6"><form onSubmit={submit} className="mx-auto max-w-3xl rounded-[28px] bg-white p-5 shadow-2xl sm:p-8">
        <style jsx global>{`.input { min-height: 3rem; width: 100%; border-radius: .75rem; border: 1px solid #cbd5e1; background: white; padding: .7rem .85rem; font-weight: 600; } .input:focus { outline: 2px solid #0e7490; outline-offset: 2px; }`}</style>
        <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-black uppercase tracking-widest text-cyan-700">Création manuelle</p><h2 className="mt-2 text-2xl font-black">Nouvelle réservation Charter</h2></div><button type="button" onClick={() => setOpen(false)} className="rounded-full border px-4 py-2 font-black">Fermer</button></div>
        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <Field label="Formule"><select value={form.formule} onChange={e => { const formule = e.target.value as CharterFormula; setAvailable(null); setForm(v => ({ ...v, formule, nombre_personnes: Math.min(v.nombre_personnes, CHARTER_FORMULA_DETAILS[formule].maxParticipants), champagne_supplement: false, sunset_drink: "white_wine" })); }} className="input">{CHARTER_FORMULAS.map(f => <option key={f} value={f}>{CHARTER_FORMULA_DETAILS[f].label}</option>)}</select></Field>
          <Field label="Date de départ"><input required type="date" min={todayTahiti()} value={form.date_debut} onChange={e => { setAvailable(null); setForm(v => ({ ...v, date_debut: e.target.value })); }} className="input" />{form.date_debut && <small className={available === false ? "font-bold text-red-700" : available ? "font-bold text-emerald-700" : "text-slate-500"}>{available === false ? "Indisponible : un créneau requis est occupé." : available ? `Disponible · Retour : ${formatDate(getCharterSlotRequirements(form.formule, form.date_debut).endDate)}` : "Vérification des créneaux…"}</small>}</Field>
          <Field label="Prénom"><input required value={form.responsable_prenom} onChange={e => setForm(v => ({ ...v, responsable_prenom: e.target.value }))} className="input" /></Field>
          <Field label="Nom"><input required value={form.responsable_nom} onChange={e => setForm(v => ({ ...v, responsable_nom: e.target.value }))} className="input" /></Field>
          <Field label="Téléphone"><input required type="tel" value={form.responsable_tel} onChange={e => setForm(v => ({ ...v, responsable_tel: e.target.value }))} className="input" /></Field>
          <Field label="Email (facultatif)"><input type="email" value={form.responsable_email} onChange={e => setForm(v => ({ ...v, responsable_email: e.target.value }))} className="input" /></Field>
          <Field label={`Nombre de personnes (max. ${CHARTER_FORMULA_DETAILS[form.formule].maxParticipants})`}><input required type="number" min="1" max={CHARTER_FORMULA_DETAILS[form.formule].maxParticipants} value={form.nombre_personnes} onChange={e => setForm(v => ({ ...v, nombre_personnes: Number(e.target.value) }))} className="input" /></Field>
          <Field label="Mode de paiement"><select value={form.type_paiement} onChange={e => setForm(v => ({ ...v, type_paiement: e.target.value }))} className="input"><option value="cash">Espèces</option><option value="check">Chèque</option><option value="bank_transfer">Virement</option><option value="card_terminal">Carte bancaire / TPE</option></select></Field>
          <Field label="Statut"><select value={form.statut_paiement} onChange={e => setForm(v => ({ ...v, statut_paiement: e.target.value }))} className="input"><option value="unpaid">Non payé</option><option value="deposit_paid">Acompte payé (30 %)</option><option value="paid">Payé intégralement</option></select></Field>
        </div>
        {form.formule === "sunset" && <section className="mt-5 rounded-2xl bg-amber-50 p-4"><p className="font-black">Options Sunset</p><label className="mt-3 block text-sm font-bold">Boisson<select value={form.sunset_drink} onChange={e => setForm(v => ({ ...v, sunset_drink: e.target.value }))} className="input mt-2"><option value="white_wine">Vin blanc</option>{form.nombre_personnes <= 2 && <option value="champagne_included">Champagne inclus</option>}</select></label>{form.nombre_personnes >= 3 && <label className="mt-3 flex gap-3 font-bold"><input type="checkbox" checked={form.champagne_supplement} onChange={e => setForm(v => ({ ...v, champagne_supplement: e.target.checked }))} /> Supplément Champagne (+15 000 F CFP)</label>}</section>}
        {CHARTER_FORMULA_DETAILS[form.formule].isTetiaroa && form.nombre_personnes === 9 && <label className="mt-5 flex gap-3 rounded-2xl bg-amber-50 p-4 font-bold"><input required type="checkbox" checked={form.sleeping_arrangement_accepted} onChange={e => setForm(v => ({ ...v, sleeping_arrangement_accepted: e.target.checked }))} /> Le client accepte le couchage de la 9e personne dans le carré.</label>}
        <section className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-cyan-950 p-4 text-white sm:gap-4"><Amount label="Total" value={amounts.total} /><Amount label="Payé" value={amounts.paid} /><Amount label="Solde" value={amounts.balance} /></section>
        <p className="mt-4 text-sm font-semibold text-slate-600">La validation vérifie et réserve atomiquement les créneaux du calendrier bateau. Aucun paiement PayZen ni e-mail n’est déclenché.</p>
        {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
        <button disabled={loading || available !== true} className="mt-6 min-h-14 w-full rounded-2xl bg-emerald-600 px-5 font-black text-white disabled:bg-slate-300">{loading ? "Création…" : "Créer et confirmer la réservation"}</button>
      </form></div>}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2 text-sm font-black">{label}{children}</label>; }
function Data({ label, value }: { label: string; value: React.ReactNode }) { return <div><dt className="text-xs font-black uppercase text-slate-500">{label}</dt><dd className="mt-1 break-words font-bold">{value}</dd></div>; }
function Amount({ label, value }: { label: string; value: number }) { return <div><p className="text-xs font-black uppercase text-cyan-200">{label}</p><p className="mt-1 text-sm font-black sm:text-lg">{formatXpf(value)}</p></div>; }
function Status({ value }: { value: string }) { const paid = value === "paid" || value === "paye"; const partial = value === "deposit_paid"; return <span className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-black ${paid ? "bg-emerald-100 text-emerald-800" : partial ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{statusLabels[value] || value}</span>; }
