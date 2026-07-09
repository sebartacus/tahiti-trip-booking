import { useRef } from "react";
import type { WhaleWatchingTranslations } from "@/lib/i18n";
import { whaleWatchingTranslations } from "@/lib/i18n";
import type { Demandes, Participant } from "../lib/types";
import { MAX_MISE_EAU, MAX_OBSERVATEURS } from "../lib/rules";
import { ParticipantForm } from "./ParticipantForm";

type ParticipantsStepProps = {
  participants: Participant[];
  demandes: Demandes;
  placesRestantesMiseEau: number;
  placesRestantesObservateur: number;
  peutAjouterParticipant: boolean;
  peutAjouterMiseEau: boolean;
  peutAjouterObservateur: boolean;
  responsableEmail: string;
  responsableTelephone: string;
  onAddParticipant: () => void;
  onParticipantChange: (
    index: number,
    field: keyof Participant,
    value: string | boolean
  ) => void;
  onParticipantAgeBlur: (index: number) => void;
  onEmailChange: (value: string) => void;
  onTelephoneChange: (value: string) => void;
  onRemoveParticipant: (index: number) => void;
  t?: WhaleWatchingTranslations;
};

export function ParticipantsStep({
  participants,
  demandes,
  placesRestantesMiseEau,
  placesRestantesObservateur,
  peutAjouterParticipant,
  peutAjouterMiseEau,
  peutAjouterObservateur,
  responsableEmail,
  responsableTelephone,
  onAddParticipant,
  onParticipantChange,
  onParticipantAgeBlur,
  onEmailChange,
  onTelephoneChange,
  onRemoveParticipant,
  t = whaleWatchingTranslations.fr,
}: ParticipantsStepProps) {
  const lastNativeAddAt = useRef(0);

  function addParticipant() {
    if (Date.now() - lastNativeAddAt.current < 400) return;
    if (!peutAjouterParticipant) return;
    lastNativeAddAt.current = Date.now();
    onAddParticipant();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black leading-tight text-slate-950">
          {t.participantsStep.title}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          {t.participantsStep.text}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
          <p className="text-sm font-bold text-cyan-900">
            {t.participantsStep.waterEntry}
          </p>
          <p className="mt-1 text-2xl font-black text-cyan-950">
            {demandes.miseEau}/{Math.max(0, placesRestantesMiseEau)}
          </p>
          <p className="mt-1 text-xs font-bold text-cyan-700">
            {MAX_MISE_EAU} {t.participantsStep.max}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-100 bg-white p-4">
          <p className="text-sm font-bold text-blue-900">
            {t.participantsStep.observers}
          </p>
          <p className="mt-1 text-2xl font-black text-blue-950">
            {demandes.observateurs}/{Math.max(0, placesRestantesObservateur)}
          </p>
          <p className="mt-1 text-xs font-bold text-blue-700">
            {MAX_OBSERVATEURS} {t.participantsStep.max}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {participants.map((participant, index) => (
          <ParticipantForm
            key={index}
            participant={participant}
            index={index}
            canRemove={participants.length > 1}
            canSwitchToMiseEau={
              participant.role === "mise_eau" || peutAjouterMiseEau
            }
            canSwitchToObservateur={
              participant.role === "observateur" || peutAjouterObservateur
            }
            responsableEmail={responsableEmail}
            responsableTelephone={responsableTelephone}
            onParticipantChange={onParticipantChange}
            onParticipantAgeBlur={onParticipantAgeBlur}
            onEmailChange={onEmailChange}
            onTelephoneChange={onTelephoneChange}
            onRemove={onRemoveParticipant}
            t={t}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addParticipant}
        onPointerUp={(event) => {
          if (event.pointerType !== "mouse") addParticipant();
        }}
        aria-disabled={!peutAjouterParticipant}
        className="min-h-14 w-full rounded-2xl bg-cyan-700 px-5 text-base font-black text-white shadow-[0_14px_28px_rgba(8,145,178,0.22)] transition active:bg-cyan-800 aria-disabled:bg-slate-300 aria-disabled:shadow-none"
      >
        {t.participantsStep.add}
      </button>
    </div>
  );
}
