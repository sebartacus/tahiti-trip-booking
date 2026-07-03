import type { Depart, Participant } from "../lib/types";
import {
  TARIF_ENFANT_OBSERVATEUR,
  TARIF_MISE_EAU,
  TARIF_OBSERVATEUR,
  formatPrix,
  prixParticipant,
} from "../lib/rules";

type SummaryStepProps = {
  date: string;
  depart: Depart;
  participants: Participant[];
  total: number;
  envoi: boolean;
  erreur: string;
  message: string;
  onPay: () => void;
};

export function SummaryStep({
  date,
  depart,
  participants,
  total,
  envoi,
  erreur,
  message,
  onPay,
}: SummaryStepProps) {
  const nageurs = participants.filter(
    (participant) => participant.role === "mise_eau"
  ).length;
  const observateurs = participants.filter(
    (participant) => participant.role === "observateur"
  ).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black leading-tight text-slate-950">
          Résumé
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          Vérifiez les informations avant paiement.
        </p>
      </div>

      <div className="grid gap-3">
        <SummaryLine label="Date" value={date || "Non choisie"} />
        <SummaryLine label="Départ" value={depart} />
        <SummaryLine label="Nageurs" value={`${nageurs}`} />
        <SummaryLine label="Observateurs" value={`${observateurs}`} />
      </div>

      <div className="rounded-2xl bg-cyan-50 p-4">
        <h3 className="font-black text-cyan-950">Participants</h3>
        <div className="mt-3 space-y-3">
          {participants.map((participant, index) => (
            <div
              key={index}
              className="rounded-2xl bg-white p-3 text-sm font-semibold text-slate-700"
            >
              <div className="flex justify-between gap-3">
                <span>
                  {index + 1}. {participant.prenom || "Prénom"}{" "}
                  {participant.nom || "Nom"}
                </span>
                <strong className="text-cyan-900">
                  {formatPrix(prixParticipant(participant))}
                </strong>
              </div>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                {participant.role === "mise_eau" ? "Mise à l'eau" : "Observateur"}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-100 bg-white p-4">
        <p className="text-sm font-bold text-slate-600">
          Mise à l&apos;eau : {formatPrix(TARIF_MISE_EAU)}
        </p>
        <p className="mt-2 text-sm font-bold text-slate-600">
          Observateur adulte : {formatPrix(TARIF_OBSERVATEUR)}
        </p>
        <p className="mt-2 text-sm font-bold text-slate-600">
          Enfant observateur : {formatPrix(TARIF_ENFANT_OBSERVATEUR)}
        </p>
        <div className="my-4 border-t border-cyan-100" />
        <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
          Total
        </p>
        <p className="mt-1 text-4xl font-black text-cyan-950">
          {formatPrix(total)}
        </p>
      </div>

      <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
          Départ
        </p>
        <p className="mt-2 text-lg font-black text-cyan-950">
          Marina Taina, Punaauia
        </p>
        <p className="mt-4 text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
          Rendez-vous
        </p>
        <p className="mt-2 text-base font-bold leading-6 text-slate-700">
          Quai principal, devant les restaurants Casa Bianca.
        </p>
      </div>

      {erreur && (
        <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
          {erreur}
        </p>
      )}

      {message && (
        <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          {message}
        </p>
      )}

      <article className="rounded-[28px] border border-cyan-100 bg-white p-5 shadow-[0_18px_45px_rgba(8,145,178,0.10)] transition focus-within:border-cyan-700">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
          Paiement complet
        </p>
        <h3 className="mt-3 text-2xl font-black leading-tight text-slate-950">
          Confirmer la réservation
        </h3>
        <p className="mt-6 text-4xl font-black text-cyan-700">
          {formatPrix(total)}
        </p>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          Paiement sécurisé par PayZen.
        </p>
        <button
          type="button"
          onClick={onPay}
          disabled={envoi}
          className="mt-5 min-h-14 w-full rounded-2xl bg-cyan-700 px-5 text-base font-black text-white shadow-[0_14px_28px_rgba(8,145,178,0.22)] outline-none transition active:ring-4 active:ring-cyan-100 disabled:bg-slate-300 disabled:shadow-none"
        >
          {envoi ? "Redirection..." : "Payer avec PayZen"}
        </button>
      </article>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-14 items-center justify-between rounded-2xl bg-cyan-50 px-4">
      <span className="text-sm font-black text-cyan-900">{label}</span>
      <strong className="text-base font-black text-slate-950">{value}</strong>
    </div>
  );
}
