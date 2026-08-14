"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useAdminSession } from "@/hooks/useAdminSession";
import { formatXpf, getPermisPriceForFormula, getPermisSalonPricing } from "@/lib/permisPricing";
import { supabase } from "@/lib/supabase";
import { getTahitiToday, getTahitiTodayAsLocalDate } from "@/lib/tahiti-date";

const individualSlots = ["07h00 - 09h00", "09h00 - 11h00", "11h00 - 13h00", "13h00 - 15h00", "15h00 - 17h00"];
const sharedSlots = ["07h00 - 11h00", "09h00 - 13h00", "11h00 - 15h00", "13h00 - 17h00"];
const paymentLabels: Record<string, string> = { payzen: "PayZen", especes: "Espèces", cheque: "Chèque", tpe: "Carte bancaire – TPE" };

function slotRange(value: string) {
  const match = /^(\d{2})h(\d{2}) - (\d{2})h(\d{2})$/.exec(value);
  return match ? { start: +match[1] * 60 + +match[2], end: +match[3] * 60 + +match[4] } : null;
}

function overlaps(left: string, right: string) {
  const a = slotRange(left); const b = slotRange(right);
  return Boolean(a && b && a.start < b.end && b.start < a.end);
}

function nextExams() {
  const dates: { value: string; label: string }[] = [];
  const date = getTahitiTodayAsLocalDate();
  while (dates.length < 4) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() === 3) {
      dates.push({ value: date.toLocaleDateString("fr-FR"), label: `Session du ${date.toLocaleDateString("fr-FR")}` });
    }
  }
  return [...dates, { value: "Plus tard", label: "Je choisirai plus tard" }];
}

type CreatedReservation = Record<string, string | number | null>;

export default function NewPermisSalonReservationPage() {
  const { checking, authenticated } = useAdminSession();
  const pricing = getPermisSalonPricing();
  const exams = useMemo(() => nextExams(), []);
  const [form, setForm] = useState({ formule: "Classique", prenom: "", nom: "", prenom2: "", nom2: "", telephone: "", email: "", examen: "Plus tard", cours_plus_tard: false, date_cours: "", type_cours: "individuel", creneau: "", mode_paiement: "payzen", reference_paiement: "" });
  const [reservedSlots, setReservedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [created, setCreated] = useState<CreatedReservation | null>(null);
  const participants = !form.cours_plus_tard && form.type_cours === "commun" ? 2 : 1;
  const amount = getPermisPriceForFormula(form.formule, pricing) * participants;
  const isWednesday = form.date_cours ? new Date(`${form.date_cours}T12:00:00`).getDay() === 3 : false;
  const rawSlots = form.type_cours === "commun" ? sharedSlots : individualSlots;
  const slots = isWednesday ? rawSlots.filter((slot) => (slotRange(slot)?.start || 0) >= 13 * 60) : rawSlots;

  function update(name: string, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value, ...(name === "type_cours" || name === "date_cours" ? { creneau: "" } : {}) }));
  }

  async function loadAvailability(date: string) {
    setReservedSlots([]);
    if (!date) return;
    const result = await supabase.from("reservations").select("creneau").eq("date_cours", new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR"));
    if (!result.error) setReservedSlots((result.data || []).map((item) => item.creneau).filter(Boolean) as string[]);
  }

  function sendToPayzen(payment: { url: string; champs: Record<string, string> }) {
    const element = document.createElement("form"); element.method = "POST"; element.action = payment.url;
    Object.entries(payment.champs).forEach(([name, value]) => { const input = document.createElement("input"); input.type = "hidden"; input.name = name; input.value = value; element.appendChild(input); });
    document.body.appendChild(element); element.submit();
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(""); setWarning("");
    const payload = { ...form, date_cours: form.cours_plus_tard ? "" : new Date(`${form.date_cours}T12:00:00`).toLocaleDateString("fr-FR") };
    try {
      const response = await fetch("/api/admin/permis/salon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Impossible de créer la réservation."); return; }
      if (form.mode_paiement === "payzen") { sendToPayzen(result.payment); return; }
      setCreated(result.reservation); setWarning(result.warning || "");
    } catch { setError("Impossible de joindre le serveur."); } finally { setLoading(false); }
  }

  async function downloadInvoice(path: string) {
    const result = await supabase.storage.from("documents-permis").createSignedUrl(path, 600);
    if (result.data?.signedUrl) window.open(result.data.signedUrl, "_blank"); else setError("Impossible d’ouvrir la facture.");
  }

  if (checking || !authenticated) return <main className="min-h-screen bg-slate-100 p-8 text-center font-bold">Vérification de la session admin…</main>;
  if (created) return <main className="min-h-screen bg-slate-100 p-4 md:p-10"><section className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-xl md:p-10"><p className="text-sm font-black uppercase tracking-widest text-green-700">Réservation créée et paiement enregistré</p><h1 className="mt-3 text-3xl font-black">{created.prenom} {created.nom}</h1>{warning && <p className="mt-4 rounded-xl bg-amber-100 p-4 font-bold text-amber-900">{warning}</p>}<dl className="mt-8 grid gap-4 rounded-2xl bg-slate-50 p-5 md:grid-cols-2"><div><dt className="text-sm text-slate-500">Formule</dt><dd className="font-bold">{String(created.formule)}</dd></div><div><dt className="text-sm text-slate-500">Montant</dt><dd className="font-bold">{formatXpf(Number(created.pricing_amount))}</dd></div><div><dt className="text-sm text-slate-500">Paiement</dt><dd className="font-bold">{paymentLabels[String(created.mode_paiement)]}</dd></div><div><dt className="text-sm text-slate-500">Examen</dt><dd className="font-bold">{String(created.examen)}</dd></div><div><dt className="text-sm text-slate-500">Cours pratique</dt><dd className="font-bold">{created.date_cours ? `${created.date_cours} · ${created.creneau}` : "À choisir plus tard"}</dd></div></dl><div className="mt-8 flex flex-col gap-3 sm:flex-row"><button onClick={() => downloadInvoice(String(created.facture_url))} className="rounded-xl bg-sky-700 px-5 py-3 font-bold text-white">Télécharger la facture</button><Link href="/admin#reservations-permis" className="rounded-xl border border-slate-300 px-5 py-3 text-center font-bold">Retour au tableau de bord</Link></div></section></main>;

  const field = "w-full rounded-xl border border-slate-300 bg-white p-3";
  return <main className="min-h-screen bg-slate-100 p-4 md:p-8"><form onSubmit={submit} className="mx-auto max-w-5xl space-y-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="text-sm font-black uppercase tracking-widest text-sky-700">Mode Salon</p><h1 className="text-3xl font-black">Nouvelle réservation Permis</h1><p className="mt-2 font-bold text-amber-700">Tarif Salon du tourisme</p></div><Link href="/admin#reservations-permis" className="font-bold text-sky-800">← Tableau de bord</Link></div>
    <section className="rounded-2xl bg-white p-5 shadow"><h2 className="mb-4 text-xl font-black">Formule et candidat</h2><div className="grid gap-4 md:grid-cols-2"><label>Formule<select className={field} value={form.formule} onChange={(e) => update("formule", e.target.value)}><option>Classique</option><option>Sérénité</option></select></label><div className="rounded-xl bg-sky-50 p-3 font-black text-sky-900">{formatXpf(amount)} {participants === 2 && "(2 candidats)"}</div><label>Prénom *<input required className={field} value={form.prenom} onChange={(e) => update("prenom", e.target.value)} /></label><label>Nom *<input required className={field} value={form.nom} onChange={(e) => update("nom", e.target.value)} /></label><label>Téléphone *<input required className={field} value={form.telephone} onChange={(e) => update("telephone", e.target.value)} /></label><label>E-mail (facultatif)<input type="email" className={field} value={form.email} onChange={(e) => update("email", e.target.value)} /></label></div></section>
    <section className="rounded-2xl bg-white p-5 shadow"><h2 className="mb-4 text-xl font-black">Examen et cours pratique</h2><div className="grid gap-4 md:grid-cols-2"><label>Examen *<select className={field} value={form.examen} onChange={(e) => update("examen", e.target.value)}>{exams.map((exam) => <option key={exam.value} value={exam.value}>{exam.label}</option>)}</select></label><label className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"><input type="checkbox" checked={form.cours_plus_tard} onChange={(e) => update("cours_plus_tard", e.target.checked)} /> Cours pratique à choisir plus tard</label>{!form.cours_plus_tard && <><label>Date du cours *<input required type="date" min={getTahitiToday()} className={field} value={form.date_cours} onChange={(e) => { update("date_cours", e.target.value); void loadAvailability(e.target.value); }} /></label><label>Type de cours<select className={field} value={form.type_cours} onChange={(e) => update("type_cours", e.target.value)}><option value="individuel">Individuel</option><option value="commun">Commun (2 candidats)</option></select></label>{form.type_cours === "commun" && <><label>Prénom du second candidat *<input required className={field} value={form.prenom2} onChange={(e) => update("prenom2", e.target.value)} /></label><label>Nom du second candidat *<input required className={field} value={form.nom2} onChange={(e) => update("nom2", e.target.value)} /></label></>}<label className="md:col-span-2">Créneau *<select required className={field} value={form.creneau} onChange={(e) => update("creneau", e.target.value)}><option value="">Choisir un créneau</option>{slots.map((slot) => { const disabled = reservedSlots.some((reserved) => overlaps(slot, reserved)); return <option key={slot} value={slot} disabled={disabled}>{slot}{disabled ? " — indisponible" : ""}</option>; })}</select></label></>}</div></section>
    <section className="rounded-2xl bg-white p-5 shadow"><h2 className="mb-4 text-xl font-black">Mode de règlement</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(paymentLabels).map(([value, label]) => <label key={value} className={`rounded-xl border p-4 font-bold ${form.mode_paiement === value ? "border-sky-700 bg-sky-50" : "border-slate-200"}`}><input className="mr-2" type="radio" name="payment" value={value} checked={form.mode_paiement === value} onChange={(e) => update("mode_paiement", e.target.value)} />{label}</label>)}</div>{form.mode_paiement === "cheque" && <label className="mt-4 block">Numéro de chèque (facultatif)<input className={field} value={form.reference_paiement} onChange={(e) => update("reference_paiement", e.target.value)} /></label>}{form.mode_paiement === "tpe" && <label className="mt-4 block">Référence du ticket TPE (facultatif)<input className={field} value={form.reference_paiement} onChange={(e) => update("reference_paiement", e.target.value)} /></label>}</section>
    {error && <p className="rounded-xl bg-red-100 p-4 font-bold text-red-800">{error}</p>}<button disabled={loading} className="w-full rounded-2xl bg-green-700 p-4 text-lg font-black text-white disabled:bg-slate-400">{loading ? "Création…" : form.mode_paiement === "payzen" ? `Créer et ouvrir PayZen · ${formatXpf(amount)}` : `Créer et enregistrer le paiement · ${formatXpf(amount)}`}</button></form></main>;
}
