"use client";

import { FormEvent, useMemo, useState } from "react";
import { SALON_PRICING, formatSalonPrice } from "@/lib/salon-pricing";
import {
  SALON_BALEINES_OFFERS,
  calculateSalonBaleinesSale,
  emptySalonBaleinesComposition,
  getSalonBaleinesValidityLabel,
  type SalonBaleinesCategory,
} from "@/lib/salonBaleines";
import { SALON_PAYMENT_LABELS } from "@/lib/salonSales";
import {
  POINTURES_PALMES,
  SAISON_DEBUT,
  SAISON_FIN,
  TAILLES_COMBI,
} from "@/app/baleines/lib/rules";

type Participant = {
  prenom: string;
  nom: string;
  age: string;
  category: SalonBaleinesCategory;
  materielPerso: boolean;
  tailleCombinaison: string;
  pointurePalmes: string;
};
type Props = {
  onRefresh: () => Promise<void>;
  openInvoice: (id: string) => Promise<void>;
  generateInvoice: (id: string) => Promise<string | null>;
  sendInvoice: (id: string) => Promise<boolean>;
};
const field =
  "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white p-3";

export function SalonBaleinesForm({
  onRefresh,
  openInvoice,
  generateInvoice,
  sendInvoice,
}: Props) {
  const [kind, setKind] = useState<"individual" | "five_plus_one">(
    "individual",
  );
  const [composition, setComposition] = useState(
    emptySalonBaleinesComposition(),
  );
  const [bookLater, setBookLater] = useState(true);
  const [date, setDate] = useState("");
  const [depart, setDepart] = useState("07:00");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [availability, setAvailability] = useState<Record<
    string,
    { miseEau: number; observateurs: number; boatAvailable: boolean }
  > | null>(null);
  const [client, setClient] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    paymentMethod: "tpe",
    paymentReference: "",
    comment: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [created, setCreated] = useState<{
    saleId: string;
    label: string;
    total: number;
    invoiceNumber?: string | null;
  } | null>(null);
  const offer = useMemo(
    () => calculateSalonBaleinesSale(kind, composition),
    [kind, composition],
  );

  function selectKind(value: "individual" | "five_plus_one") {
    setKind(value);
    setParticipants([]);
    if (value === "five_plus_one")
      setComposition({ ...emptySalonBaleinesComposition(), mise_eau: 6 });
  }
  function updateCount(category: SalonBaleinesCategory, count: number) {
    setComposition((current) => ({
      ...current,
      [category]: Math.max(0, count),
    }));
    setParticipants([]);
  }
  function prepareParticipants() {
    if (!offer) return;
    const next: Participant[] = [];
    for (const [category, count] of Object.entries(offer.composition) as [
      SalonBaleinesCategory,
      number,
    ][])
      for (let index = 0; index < count; index += 1)
        next.push({
          prenom: "",
          nom: "",
          age:
            category === "enfant_moins_5"
              ? "4"
              : category === "enfant_moins_12"
                ? "10"
                : "",
          category,
          materielPerso: false,
          tailleCombinaison: "",
          pointurePalmes: "",
        });
    setParticipants(next);
  }
  async function loadAvailability(nextDate: string) {
    setDate(nextDate);
    setAvailability(null);
    if (!nextDate) return;
    const response = await fetch(
      `/api/admin/salon/baleines?date=${encodeURIComponent(nextDate)}`,
      { cache: "no-store" },
    );
    const payload = await response.json();
    if (response.ok) setAvailability(payload.availability);
    else setError(payload.error);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (!offer) throw new Error("Composition invalide.");
      if (!bookLater && participants.length === 0)
        throw new Error("Préparez les fiches participants.");
      const response = await fetch("/api/admin/salon/baleines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          composition,
          bookLater,
          date,
          depart,
          participants,
          ...client,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setCreated({
        saleId: payload.saleId,
        label: payload.label,
        total: payload.total,
      });
      await onRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Création impossible.");
    } finally {
      setLoading(false);
    }
  }

  if (created)
    return (
      <section className="rounded-3xl bg-white p-6 shadow">
        <p className="font-black uppercase tracking-widest text-emerald-700">
          VENTE BALEINES SALON ENREGISTRÉE
        </p>
        <h2 className="mt-3 text-2xl font-black">{created.label}</h2>
        <p className="mt-2 text-xl font-black">
          {formatSalonPrice(created.total)}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {created.invoiceNumber ? (
            <button
              onClick={() => void openInvoice(created.saleId)}
              className="rounded-xl bg-cyan-800 px-5 py-3 font-bold text-white"
            >
              Voir la facture
            </button>
          ) : (
            <button
              disabled={loading}
              onClick={async () => {
                const invoiceNumber = await generateInvoice(created.saleId);
                if (invoiceNumber) setCreated({ ...created, invoiceNumber });
              }}
              className="rounded-xl bg-amber-600 px-5 py-3 font-bold text-white"
            >
              Générer la facture
            </button>
          )}
          {created.invoiceNumber && client.email && (
            <button
              disabled={loading}
              onClick={() => void sendInvoice(created.saleId)}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white"
            >
              Envoyer par e-mail
            </button>
          )}
          <button
            onClick={() => setCreated(null)}
            className="rounded-xl border px-5 py-3 font-bold"
          >
            Nouvelle vente
          </button>
        </div>
        {message && <p>{message}</p>}
      </section>
    );

  return (
    <form
      onSubmit={submit}
      className="space-y-6 rounded-3xl bg-white p-5 shadow md:p-8"
    >
      <div>
        <p className="font-black uppercase tracking-widest text-cyan-700">
          Baleines · Sorties
        </p>
        <h2 className="mt-2 text-2xl font-black">
          Tarifs individuels et offre 5+1
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => selectKind("individual")}
          className={`rounded-2xl border-2 p-5 text-left ${kind === "individual" ? "border-cyan-700 bg-cyan-50" : "border-slate-200"}`}
        >
          <strong>Tarifs individuels</strong>
          <span className="mt-2 block text-sm">
            Composez librement le groupe
          </span>
        </button>
        <button
          type="button"
          onClick={() => selectKind("five_plus_one")}
          className={`rounded-2xl border-2 p-5 text-left ${kind === "five_plus_one" ? "border-amber-500 bg-amber-50" : "border-slate-200"}`}
        >
          <strong>OFFRE SALON 5+1</strong>
          <span className="mt-2 block text-xl font-black">
            6 mises à l’eau ·{" "}
            {formatSalonPrice(SALON_PRICING.baleines.groupe.total)}
          </span>
          <span className="text-sm">Une seule et même sortie</span>
        </button>
      </div>
      {kind === "individual" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            Object.entries(SALON_BALEINES_OFFERS) as [
              SalonBaleinesCategory,
              (typeof SALON_BALEINES_OFFERS)[SalonBaleinesCategory],
            ][]
          ).map(([category, item]) => (
            <label key={category} className="rounded-xl border p-4 font-bold">
              {item.label}
              <span className="block text-sm text-cyan-800">
                {item.salon === 0 ? "GRATUIT" : formatSalonPrice(item.salon)}
              </span>
              <input
                type="number"
                min="0"
                max={category === "mise_eau" ? 6 : 2}
                value={composition[category]}
                onChange={(event) =>
                  updateCount(category, Number(event.target.value))
                }
                className={field}
              />
            </label>
          ))}
        </div>
      )}
      <p className="rounded-xl bg-cyan-50 p-4 font-black">
        Total calculé :{" "}
        {offer ? formatSalonPrice(offer.total) : "Composition invalide"}
      </p>
      <p className="font-bold text-amber-800">
        Valable jusqu’au {getSalonBaleinesValidityLabel()}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {(["firstName", "lastName", "phone", "email"] as const).map((name) => (
          <label key={name} className="font-bold">
            {
              {
                firstName: "Prénom *",
                lastName: "Nom *",
                phone: "Téléphone *",
                email: "E-mail",
              }[name]
            }
            <input
              required={name !== "email"}
              type={name === "email" ? "email" : "text"}
              value={client[name]}
              onChange={(e) =>
                setClient((value) => ({ ...value, [name]: e.target.value }))
              }
              className={field}
            />
          </label>
        ))}
      </div>
      <section>
        <h3 className="font-black">Paiement</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          {Object.entries(SALON_PAYMENT_LABELS).map(([value, label]) => (
            <label key={value} className="rounded-xl border p-3 font-bold">
              <input
                type="radio"
                checked={client.paymentMethod === value}
                onChange={() =>
                  setClient((current) => ({ ...current, paymentMethod: value }))
                }
                className="mr-2"
              />
              {label}
            </label>
          ))}
        </div>
        {(client.paymentMethod === "cheque" ||
          client.paymentMethod === "virement") && (
          <label className="mt-4 block font-bold">
            Référence (facultative)
            <input
              value={client.paymentReference}
              onChange={(e) =>
                setClient((current) => ({
                  ...current,
                  paymentReference: e.target.value,
                }))
              }
              className={field}
            />
          </label>
        )}
      </section>
      <label className="block font-bold">
        Commentaire interne
        <textarea
          rows={3}
          value={client.comment}
          onChange={(e) =>
            setClient((current) => ({ ...current, comment: e.target.value }))
          }
          className={field}
        />
      </label>
      <section>
        <h3 className="font-black">Planification</h3>
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="rounded-xl border p-4 font-bold">
            <input
              type="radio"
              checked={bookLater}
              onChange={() => {
                setBookLater(true);
                setParticipants([]);
              }}
              className="mr-2"
            />
            Réserver plus tard
          </label>
          <label className="rounded-xl border p-4 font-bold">
            <input
              type="radio"
              checked={!bookLater}
              onChange={() => setBookLater(false)}
              className="mr-2"
            />
            Choisir la sortie maintenant
          </label>
        </div>
        {!bookLater && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="font-bold">
                Date
                <input
                  type="date"
                  required
                  min={SAISON_DEBUT}
                  max={SAISON_FIN}
                  value={date}
                  onChange={(e) => void loadAvailability(e.target.value)}
                  className={field}
                />
              </label>
              <label className="font-bold">
                Départ
                <select
                  value={depart}
                  onChange={(e) => setDepart(e.target.value)}
                  className={field}
                >
                  {(["07:00", "13:15"] as const).map((value) => {
                    const current = availability?.[value];
                    const requiredMise = offer?.composition.mise_eau || 0;
                    const requiredObservers = offer
                      ? offer.composition.observateur +
                        offer.composition.enfant_moins_12 +
                        offer.composition.enfant_moins_5
                      : 0;
                    const unavailable = Boolean(
                      current &&
                      (!current.boatAvailable ||
                        current.miseEau + requiredMise > 6 ||
                        current.observateurs + requiredObservers > 2),
                    );
                    return (
                      <option key={value} value={value} disabled={unavailable}>
                        {value}
                        {current
                          ? ` — ${Math.max(0, 6 - current.miseEau)} mise(s) à l'eau, ${Math.max(0, 2 - current.observateurs)} observateur(s)`
                          : ""}
                        {unavailable ? " — complet" : ""}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={prepareParticipants}
              className="rounded-xl border border-cyan-700 px-4 py-3 font-bold text-cyan-800"
            >
              Préparer les participants
            </button>
            <div className="grid gap-3">
              {participants.map((participant, index) => (
                <div
                  key={`${participant.category}-${index}`}
                  className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-4"
                >
                  <strong>
                    {SALON_BALEINES_OFFERS[participant.category].label}
                  </strong>
                  <input
                    required
                    placeholder="Prénom"
                    value={participant.prenom}
                    onChange={(e) =>
                      setParticipants((items) =>
                        items.map((item, i) =>
                          i === index
                            ? { ...item, prenom: e.target.value }
                            : item,
                        ),
                      )
                    }
                    className={field}
                  />
                  <input
                    required
                    placeholder="Nom"
                    value={participant.nom}
                    onChange={(e) =>
                      setParticipants((items) =>
                        items.map((item, i) =>
                          i === index ? { ...item, nom: e.target.value } : item,
                        ),
                      )
                    }
                    className={field}
                  />
                  <input
                    required
                    type="number"
                    min="0"
                    max="120"
                    placeholder="Âge"
                    value={participant.age}
                    onChange={(e) =>
                      setParticipants((items) =>
                        items.map((item, i) =>
                          i === index ? { ...item, age: e.target.value } : item,
                        ),
                      )
                    }
                    className={field}
                  />
                  {participant.category === "mise_eau" && (
                    <>
                      <label className="font-bold">
                        <input
                          type="checkbox"
                          checked={participant.materielPerso}
                          onChange={(e) =>
                            setParticipants((items) =>
                              items.map((item, i) =>
                                i === index
                                  ? { ...item, materielPerso: e.target.checked }
                                  : item,
                              ),
                            )
                          }
                          className="mr-2"
                        />
                        Matériel personnel
                      </label>
                      {!participant.materielPerso && (
                        <>
                          <select
                            required
                            value={participant.tailleCombinaison}
                            onChange={(e) =>
                              setParticipants((items) =>
                                items.map((item, i) =>
                                  i === index
                                    ? {
                                        ...item,
                                        tailleCombinaison: e.target.value,
                                      }
                                    : item,
                                ),
                              )
                            }
                            className={field}
                          >
                            <option value="">Combinaison</option>
                            {TAILLES_COMBI.map((value) => (
                              <option key={value}>{value}</option>
                            ))}
                          </select>
                          <select
                            required
                            value={participant.pointurePalmes}
                            onChange={(e) =>
                              setParticipants((items) =>
                                items.map((item, i) =>
                                  i === index
                                    ? {
                                        ...item,
                                        pointurePalmes: e.target.value,
                                      }
                                    : item,
                                ),
                              )
                            }
                            className={field}
                          >
                            <option value="">Pointure</option>
                            {POINTURES_PALMES.map((value) => (
                              <option key={value}>{value}</option>
                            ))}
                          </select>
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
      {error && (
        <p className="rounded-xl bg-red-100 p-4 font-bold text-red-800">
          {error}
        </p>
      )}
      <button
        disabled={loading || !offer}
        className="min-h-14 w-full rounded-2xl bg-emerald-700 text-lg font-black text-white disabled:bg-slate-400"
      >
        {loading
          ? "Enregistrement…"
          : `Enregistrer · ${offer ? formatSalonPrice(offer.total) : "—"}`}
      </button>
    </form>
  );
}
