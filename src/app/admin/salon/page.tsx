"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAdminSession } from "@/hooks/useAdminSession";
import { SALON_PRICING, formatSalonPrice } from "@/lib/salon-pricing";
import {
  SALON_PAYMENT_LABELS,
  getSalonPermisValidityLabel,
} from "@/lib/salonSales";
import { getTahitiToday, getTahitiTodayAsLocalDate } from "@/lib/tahiti-date";
import { SalonCarnetForm } from "./SalonCarnetForm";
import { SalonBaleinesForm } from "./SalonBaleinesForm";
import { SalonPecheForm } from "./SalonPecheForm";
import { SalonCharterForm } from "./SalonCharterForm";

const slots = [
  "07h00 - 09h00",
  "09h00 - 11h00",
  "11h00 - 13h00",
  "13h00 - 15h00",
  "15h00 - 17h00",
];
type Sale = {
  id: string;
  sold_at: string;
  client_prenom: string;
  client_nom: string;
  payment_method: keyof typeof SALON_PAYMENT_LABELS;
  montant_total: number;
  statut: string;
  facture_url: string | null;
  salon_sale_items: Array<{
    id: string;
    activity: string;
    libelle: string;
    reservation_id: string;
    valid_until: string;
    sortie_date?: string | null;
    fulfillment_status?: string;
    participants?: number;
  }>;
};
type Created = {
  saleId: string;
  reservationId: string;
  invoiceNumber: string | null;
  emailAvailable: boolean;
  warning?: string;
};
type FormState = {
  offerCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  paymentMethod: string;
  paymentReference: string;
  bookingLater: boolean;
  exam: string;
  courseDate: string;
  slot: string;
  comment: string;
};

function nextExams(blocked: string[]) {
  const result: Array<{ value: string; label: string }> = [];
  const date = getTahitiTodayAsLocalDate();
  while (result.length < 4) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() === 3) {
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      if (!blocked.includes(iso)) {
        const value = date.toLocaleDateString("fr-FR");
        result.push({ value, label: `Session du ${value}` });
      }
    }
  }
  return result;
}
function toFrenchDate(value: string) {
  return value ? new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR") : "";
}

export default function AdminSalonPage() {
  const { authenticated, checking, logout } = useAdminSession();
  const [sales, setSales] = useState<Sale[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [reservedSlots, setReservedSlots] = useState<string[]>([]);
  const [created, setCreated] = useState<Created | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activity, setActivity] = useState<string>("permis");
  const [form, setForm] = useState<FormState>({
    offerCode: SALON_PRICING.permis.classique.offerCode,
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    paymentMethod: "tpe",
    paymentReference: "",
    bookingLater: true,
    exam: "",
    courseDate: "",
    slot: "",
    comment: "",
  });
  const exams = useMemo(() => nextExams(blocked), [blocked]);
  const selected =
    form.offerCode === SALON_PRICING.permis.serenite.offerCode
      ? SALON_PRICING.permis.serenite
      : SALON_PRICING.permis.classique;

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/salon", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) {
      setSales(payload.sales || []);
      setBlocked(payload.blockedExams || []);
    } else setError(payload.error);
  }, []);
  useEffect(() => {
    if (authenticated) void Promise.resolve().then(load);
  }, [authenticated, load]);
  function update(name: string, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
  }
  async function loadSlots(date: string) {
    update("courseDate", date);
    update("slot", "");
    setReservedSlots([]);
    if (!date) return;
    const response = await fetch(
      `/api/admin/salon?courseDate=${encodeURIComponent(toFrenchDate(date))}`,
    );
    const payload = await response.json();
    if (response.ok) setReservedSlots(payload.reservedSlots || []);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/salon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          courseDate: toFrenchDate(form.courseDate),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setCreated(payload);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Création impossible.");
    } finally {
      setLoading(false);
    }
  }
  async function openInvoice(id: string) {
    const response = await fetch(
      `/api/admin/salon/invoice?id=${encodeURIComponent(id)}`,
    );
    const payload = await response.json();
    if (response.ok) window.open(payload.url, "_blank", "noopener,noreferrer");
    else setError(payload.error);
  }
  async function generateInvoice(id: string) {
    setLoading(true);
    const response = await fetch("/api/admin/salon/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const payload = await response.json();
    setLoading(false);
    if (response.ok) {
      setCreated((current) =>
        current
          ? {
              ...current,
              invoiceNumber: payload.invoiceNumber,
              warning: undefined,
            }
          : current,
      );
      await load();
      return payload.invoiceNumber as string;
    }
    setError(payload.error);
    return null;
  }
  async function sendInvoice(id: string) {
    setLoading(true);
    const response = await fetch("/api/admin/salon/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const payload = await response.json();
    setLoading(false);
    if (response.ok) {
      setMessage("Facture envoyée par e-mail.");
      await load();
      return true;
    }
    setError(payload.error);
    return false;
  }
  async function deleteItem(saleId: string, itemId: string) {
    if (
      !window.confirm(
        "Supprimer définitivement cette vente Salon et les données associées ?",
      )
    )
      return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/salon", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId, itemId }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Suppression impossible.");
      setSales((current) =>
        current
          .map((sale) =>
            sale.id === saleId
              ? {
                  ...sale,
                  salon_sale_items: sale.salon_sale_items.filter(
                    (item) => item.id !== itemId,
                  ),
                }
              : sale,
          )
          .filter((sale) => sale.salon_sale_items.length > 0),
      );
      setMessage(payload.warning || "Vente Salon supprimée avec succès.");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Suppression impossible.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (checking || !authenticated)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 font-bold">
        Vérification de la session admin…
      </main>
    );
  if (activity === "peche")
    return (
      <main className="min-h-screen bg-slate-100 p-4 text-slate-950 md:p-8">
        <div className="mx-auto max-w-6xl space-y-7">
          <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-black uppercase tracking-[.2em] text-cyan-700">Administration</p><h1 className="mt-2 text-4xl font-black">ADMIN SALON</h1></div><nav className="flex gap-2"><button onClick={()=>setActivity("permis")} className="rounded-xl border bg-white px-4 py-3 font-bold">Permis</button><button onClick={()=>setActivity("carnet_baleines")} className="rounded-xl border bg-white px-4 py-3 font-bold">Baleines</button><Link href="/admin" className="rounded-xl border bg-white px-4 py-3 font-bold">Tableau de bord</Link></nav></header>
          <SalonPecheForm onRefresh={load} openInvoice={openInvoice} generateInvoice={generateInvoice} sendInvoice={sendInvoice}/>
          {error&&<p className="rounded-xl bg-red-100 p-4 font-bold text-red-800">{error}</p>}{message&&<p className="rounded-xl bg-emerald-100 p-4 font-bold text-emerald-800">{message}</p>}
          <SalesHistory sales={sales} openInvoice={openInvoice} deleteItem={deleteItem} loading={loading}/>
        </div>
      </main>
    );
  if (activity === "charter")
    return <main className="min-h-screen bg-slate-100 p-4 text-slate-950 md:p-8"><div className="mx-auto max-w-6xl space-y-7"><header className="flex justify-between"><div><p className="font-black uppercase tracking-[.2em] text-cyan-700">Administration</p><h1 className="text-4xl font-black">ADMIN SALON</h1></div><nav className="flex gap-2"><button onClick={()=>setActivity("permis")} className="rounded-xl border bg-white px-4 py-3 font-bold">Permis</button><button onClick={()=>setActivity("carnet_baleines")} className="rounded-xl border bg-white px-4 py-3 font-bold">Baleines</button><button onClick={()=>setActivity("peche")} className="rounded-xl border bg-white px-4 py-3 font-bold">Pêche</button></nav></header><SalonCharterForm onRefresh={load} openInvoice={openInvoice} generateInvoice={generateInvoice} sendInvoice={sendInvoice}/>{error&&<p className="rounded-xl bg-red-100 p-4 font-bold text-red-800">{error}</p>}<SalesHistory sales={sales} openInvoice={openInvoice} deleteItem={deleteItem} loading={loading}/></div></main>;
  if (activity === "carnet_baleines")
    return (
      <main className="min-h-screen bg-slate-100 p-4 text-slate-950 md:p-8">
        <div className="mx-auto max-w-6xl space-y-7">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-black uppercase tracking-[.2em] text-cyan-700">
                Administration
              </p>
              <h1 className="mt-2 text-4xl font-black">ADMIN SALON</h1>
            </div>
            <nav className="flex gap-2">
              <Link
                href="/admin"
                className="rounded-xl border bg-white px-4 py-3 font-bold"
              >
                Tableau de bord
              </Link>
              <button
                onClick={() => void logout()}
                className="rounded-xl border bg-white px-4 py-3 font-bold"
              >
                Déconnexion
              </button>
            </nav>
          </header>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={() => setActivity("permis")}
              className="rounded-2xl border-2 border-slate-200 bg-white p-5 text-left"
            >
              <p className="text-2xl">⚓</p>
              <h2 className="mt-2 text-xl font-black">Permis côtier</h2>
              <p className="text-sm font-bold text-emerald-700">Disponible</p>
            </button>
            <article className="rounded-2xl border-2 border-emerald-500 bg-white p-5">
              <p className="text-2xl">🐋</p>
              <h2 className="mt-2 text-xl font-black">Baleines</h2>
              <p className="text-sm font-bold text-emerald-700">
                Sorties et carnets disponibles
              </p>
              <p className="text-xs text-slate-500">
                Individuels · 5+1 · Carnets
              </p>
            </article>
            <button onClick={() => setActivity("peche")} className="rounded-2xl border-2 border-slate-200 bg-white p-5 text-left"><p className="text-2xl">🎣</p><h2 className="mt-2 text-xl font-black">Pêche</h2><p className="text-sm font-bold text-emerald-700">Disponible</p></button>
            <button onClick={()=>setActivity("charter")} className="rounded-2xl border-2 border-slate-200 bg-white p-5 text-left"><p className="text-2xl">⛵</p><h2 className="text-xl font-black">Charter</h2><p className="text-sm font-bold text-emerald-700">Disponible</p></button>
          </section>
          <SalonBaleinesForm
            onRefresh={load}
            openInvoice={openInvoice}
            generateInvoice={generateInvoice}
            sendInvoice={sendInvoice}
          />
          <SalonCarnetForm
            onRefresh={load}
            openInvoice={openInvoice}
            generateInvoice={generateInvoice}
            sendInvoice={sendInvoice}
          />
          {error && (
            <p className="rounded-xl bg-red-100 p-4 font-bold text-red-800">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-xl bg-emerald-100 p-4 font-bold text-emerald-800">
              {message}
            </p>
          )}
          <SalesHistory
            sales={sales}
            openInvoice={openInvoice}
            deleteItem={deleteItem}
            loading={loading}
          />
        </div>
      </main>
    );
  const field =
    "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white p-3";
  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-950 md:p-8">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-black uppercase tracking-[.2em] text-cyan-700">
              Administration
            </p>
            <h1 className="mt-2 text-4xl font-black">ADMIN SALON</h1>
          </div>
          <nav className="flex gap-2">
            <Link
              href="/admin"
              className="rounded-xl border bg-white px-4 py-3 font-bold"
            >
              Tableau de bord
            </Link>
            <button
              onClick={() => void logout()}
              className="rounded-xl border bg-white px-4 py-3 font-bold"
            >
              Déconnexion
            </button>
          </nav>
        </header>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => setActivity("permis")}
            className={`rounded-2xl border-2 bg-white p-5 text-left ${activity === "permis" ? "border-emerald-500" : "border-slate-200"}`}
          >
            <p className="text-2xl">⚓</p>
            <h2 className="mt-2 text-xl font-black">Permis côtier</h2>
            <p className="text-sm font-bold text-emerald-700">Disponible</p>
          </button>
          <button
            onClick={() => setActivity("carnet_baleines")}
            className={`rounded-2xl border-2 bg-white p-5 text-left ${activity === "carnet_baleines" ? "border-emerald-500" : "border-slate-200"}`}
          >
            <p className="text-2xl">🐋</p>
            <h2 className="mt-2 text-xl font-black">Baleines</h2>
            <p className="text-sm font-bold text-emerald-700">
              Sorties et carnets disponibles
            </p>
            <p className="text-xs text-slate-500">
              Individuels · 5+1 · Carnets
            </p>
          </button>
          <button onClick={() => setActivity("peche")} className={`rounded-2xl border-2 bg-white p-5 text-left ${activity === "peche" ? "border-emerald-500" : "border-slate-200"}`}><p className="text-2xl">🎣</p><h2 className="mt-2 text-xl font-black">Pêche</h2><p className="text-sm font-bold text-emerald-700">Disponible</p></button>
          <button onClick={()=>setActivity("charter")} className="rounded-2xl border-2 border-slate-200 bg-white p-5 text-left"><p className="text-2xl">⛵</p><h2 className="text-xl font-black">Charter</h2><p className="text-sm font-bold text-emerald-700">Disponible</p></button>
        </section>
        {created ? (
          <section className="rounded-3xl bg-white p-6 shadow md:p-8">
            <p className="font-black uppercase tracking-widest text-emerald-700">
              VENTE SALON ENREGISTRÉE
            </p>
            <h2 className="mt-3 text-3xl font-black">
              {form.firstName} {form.lastName}
            </h2>
            {created.warning && (
              <p className="mt-4 rounded-xl bg-amber-100 p-4 font-bold text-amber-900">
                {created.warning}
              </p>
            )}
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <Data
                label="Formule"
                value={
                  form.offerCode.endsWith("serenite") ? "Sérénité" : "Classique"
                }
              />
              <Data label="Tarif" value={formatSalonPrice(selected.salon)} />
              <Data
                label="Paiement"
                value={
                  SALON_PAYMENT_LABELS[
                    form.paymentMethod as keyof typeof SALON_PAYMENT_LABELS
                  ]
                }
              />
              <Data
                label="Montant encaissé"
                value={formatSalonPrice(selected.salon)}
              />
              <Data label="Solde" value="0 F CFP" />
              <Data label="Validité" value={getSalonPermisValidityLabel()} />
            </dl>
            <div className="mt-7 flex flex-wrap gap-3">
              {created.invoiceNumber ? (
                <button
                  onClick={() => void openInvoice(created.saleId)}
                  className="rounded-xl bg-cyan-800 px-5 py-3 font-bold text-white"
                >
                  Voir / télécharger la facture
                </button>
              ) : (
                <button
                  disabled={loading}
                  onClick={() => void generateInvoice(created.saleId)}
                  className="rounded-xl bg-amber-600 px-5 py-3 font-bold text-white"
                >
                  Générer la facture
                </button>
              )}
              {created.emailAvailable && created.invoiceNumber && (
                <button
                  disabled={loading}
                  onClick={() => void sendInvoice(created.saleId)}
                  className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white"
                >
                  Envoyer la facture par e-mail
                </button>
              )}
              <Link
                href="/admin#reservations-permis"
                className="rounded-xl border px-5 py-3 font-bold"
              >
                Voir la réservation Permis
              </Link>
              <button
                onClick={() => {
                  setCreated(null);
                  setForm((current) => ({
                    ...current,
                    firstName: "",
                    lastName: "",
                    phone: "",
                    email: "",
                    paymentReference: "",
                    comment: "",
                  }));
                }}
                className="rounded-xl border px-5 py-3 font-bold"
              >
                Nouvelle vente Salon
              </button>
            </div>
          </section>
        ) : (
          <form
            onSubmit={submit}
            className="space-y-5 rounded-3xl bg-white p-5 shadow md:p-8"
          >
            <h2 className="text-2xl font-black">Vente Permis côtier</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  code: SALON_PRICING.permis.classique.offerCode,
                  name: "FORMULE CLASSIQUE",
                  price: SALON_PRICING.permis.classique.salon,
                },
                {
                  code: SALON_PRICING.permis.serenite.offerCode,
                  name: "FORMULE SÉRÉNITÉ",
                  price: SALON_PRICING.permis.serenite.salon,
                },
              ].map((offer) => (
                <label
                  key={offer.code}
                  className={`rounded-2xl border-2 p-5 ${form.offerCode === offer.code ? "border-cyan-700 bg-cyan-50" : "border-slate-200"}`}
                >
                  <input
                    type="radio"
                    name="offer"
                    className="mr-2"
                    checked={form.offerCode === offer.code}
                    onChange={() => update("offerCode", offer.code)}
                  />
                  <strong>{offer.name}</strong>
                  <span className="mt-2 block text-2xl font-black">
                    {formatSalonPrice(offer.price)}
                  </span>
                </label>
              ))}
            </div>
            <p className="font-bold text-amber-800">
              Valable jusqu’au {getSalonPermisValidityLabel()}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Prénom *">
                <input
                  required
                  className={field}
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                />
              </Field>
              <Field label="Nom *">
                <input
                  required
                  className={field}
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                />
              </Field>
              <Field label="Téléphone *">
                <input
                  required
                  className={field}
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </Field>
              <Field label="E-mail (facultatif)">
                <input
                  type="email"
                  className={field}
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </Field>
            </div>
            <section>
              <h3 className="text-lg font-black">Paiement</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(SALON_PAYMENT_LABELS).map(([value, label]) => (
                  <label
                    key={value}
                    className="rounded-xl border p-4 font-bold"
                  >
                    <input
                      type="radio"
                      className="mr-2"
                      checked={form.paymentMethod === value}
                      onChange={() => update("paymentMethod", value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {(form.paymentMethod === "cheque" ||
                form.paymentMethod === "virement") && (
                <Field label="Référence (facultative)">
                  <input
                    className={field}
                    value={form.paymentReference}
                    onChange={(e) => update("paymentReference", e.target.value)}
                  />
                </Field>
              )}
            </section>
            <section>
              <h3 className="text-lg font-black">Planification</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="rounded-xl border p-4 font-bold">
                  <input
                    type="radio"
                    className="mr-2"
                    checked={!form.bookingLater}
                    onChange={() => update("bookingLater", false)}
                  />
                  Choisir les dates maintenant
                </label>
                <label className="rounded-xl border p-4 font-bold">
                  <input
                    type="radio"
                    className="mr-2"
                    checked={form.bookingLater}
                    onChange={() => update("bookingLater", true)}
                  />
                  Réserver plus tard
                </label>
              </div>
              {!form.bookingLater && (
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <Field label="Examen *">
                    <select
                      required
                      className={field}
                      value={form.exam}
                      onChange={(e) => update("exam", e.target.value)}
                    >
                      <option value="">Choisir</option>
                      {exams.map((exam) => (
                        <option key={exam.value} value={exam.value}>
                          {exam.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Cours pratique *">
                    <input
                      required
                      type="date"
                      min={getTahitiToday()}
                      className={field}
                      value={form.courseDate}
                      onChange={(e) => void loadSlots(e.target.value)}
                    />
                  </Field>
                  <Field label="Créneau individuel *">
                    <select
                      required
                      className={field}
                      value={form.slot}
                      onChange={(e) => update("slot", e.target.value)}
                    >
                      <option value="">Choisir</option>
                      {slots.map((slot) => (
                        <option
                          key={slot}
                          disabled={reservedSlots.includes(slot)}
                        >
                          {slot}
                          {reservedSlots.includes(slot)
                            ? " — indisponible"
                            : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
            </section>
            <Field label="Commentaire interne">
              <textarea
                className={field}
                rows={3}
                value={form.comment}
                onChange={(e) => update("comment", e.target.value)}
              />
            </Field>
            {error && (
              <p className="rounded-xl bg-red-100 p-4 font-bold text-red-800">
                {error}
              </p>
            )}
            <button
              disabled={loading}
              className="min-h-14 w-full rounded-2xl bg-emerald-700 px-5 text-lg font-black text-white disabled:bg-slate-400"
            >
              {loading
                ? "Enregistrement…"
                : `Enregistrer la vente · ${formatSalonPrice(selected.salon)}`}
            </button>
          </form>
        )}
        {message && (
          <p className="rounded-xl bg-emerald-100 p-4 font-bold text-emerald-800">
            {message}
          </p>
        )}
        <section className="rounded-3xl bg-white p-5 shadow md:p-8">
          <h2 className="text-2xl font-black">Historique des ventes Salon</h2>
          <div className="mt-5 grid gap-3">
            {sales.flatMap((sale) =>
              sale.salon_sale_items.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-3 rounded-2xl border p-4 md:grid-cols-[repeat(6,minmax(0,1fr))_auto] md:items-center"
                >
                  <span>
                    {new Date(sale.sold_at).toLocaleDateString("fr-FR")}
                  </span>
                  <strong>
                    {sale.client_prenom} {sale.client_nom}
                  </strong>
                  <span>{item.activity}</span>
                  <span>{item.libelle}</span>
                  <span>{formatSalonPrice(sale.montant_total)}</span>
                  <span>
                    {SALON_PAYMENT_LABELS[sale.payment_method] ||
                      sale.payment_method}
                  </span>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <button
                      disabled={!sale.facture_url}
                      onClick={() => void openInvoice(sale.id)}
                      className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40"
                    >
                      {sale.facture_url ? "Facture" : sale.statut}
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => void deleteItem(sale.id, item.id)}
                      className="rounded-lg bg-red-700 px-3 py-2 font-bold text-white disabled:opacity-40"
                    >
                      Supprimer
                    </button>
                  </div>
                </article>
              )),
            )}
            {sales.length === 0 && (
              <p className="text-slate-500">Aucune vente Salon enregistrée.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block font-bold">
      {label}
      {children}
    </label>
  );
}
function Data({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="font-black">{value}</dd>
    </div>
  );
}
function SalesHistory({
  sales,
  openInvoice,
  deleteItem,
  loading,
}: {
  sales: Sale[];
  openInvoice: (id: string) => Promise<void>;
  deleteItem: (saleId: string, itemId: string) => Promise<void>;
  loading: boolean;
}) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow md:p-8">
      <h2 className="text-2xl font-black">Historique des ventes Salon</h2>
      <div className="mt-5 grid gap-3">
        {sales.flatMap((sale) =>
          sale.salon_sale_items.map((item) => (
            <article
              key={item.id}
              className="grid gap-3 rounded-2xl border p-4 md:grid-cols-[repeat(7,minmax(0,1fr))_auto] md:items-center"
            >
              <span>{new Date(sale.sold_at).toLocaleDateString("fr-FR")}</span>
              <strong>
                {sale.client_prenom} {sale.client_nom}
              </strong>
              <span>
                {item.activity === "carnet_baleines"
                  ? "Baleines / Carnet"
                  : item.activity}
              </span>
              <span>{item.libelle}</span>
              {item.activity === "peche" && <span>{item.sortie_date ? new Date(`${item.sortie_date}T00:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC" }) : "Date à fixer"} · {item.fulfillment_status || "reserved"}</span>}
              {item.activity === "charter" && <span>{item.participants} participant{item.participants===1?"":"s"} · {item.sortie_date?new Date(`${item.sortie_date}T00:00:00Z`).toLocaleDateString("fr-FR",{timeZone:"UTC"}):"Date à fixer"} · {item.fulfillment_status}</span>}
              <span>{formatSalonPrice(sale.montant_total)}</span>
              <span>
                {SALON_PAYMENT_LABELS[sale.payment_method] ||
                  sale.payment_method}
              </span>
              <span>
                {item.valid_until
                  ? new Date(
                      `${item.valid_until}T00:00:00Z`,
                    ).toLocaleDateString("fr-FR", { timeZone: "UTC" })
                  : "—"}
              </span>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <button
                  disabled={!sale.facture_url}
                  onClick={() => void openInvoice(sale.id)}
                  className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40"
                >
                  {sale.facture_url ? "Facture" : sale.statut}
                </button>
                <button
                  disabled={loading}
                  onClick={() => void deleteItem(sale.id, item.id)}
                  className="rounded-lg bg-red-700 px-3 py-2 font-bold text-white disabled:opacity-40"
                >
                  Supprimer
                </button>
              </div>
            </article>
          )),
        )}
        {sales.length === 0 && (
          <p className="text-slate-500">Aucune vente Salon enregistrée.</p>
        )}
      </div>
    </section>
  );
}
