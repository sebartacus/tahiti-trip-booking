import type { WhaleWatchingTranslations } from "@/lib/i18n";
import { whaleWatchingTranslations } from "@/lib/i18n";
import type { Participant, Role } from "../lib/types";
import {
  POINTURES_PALMES,
  TAILLES_COMBI,
  ageRenseigneMineurComplet,
  formatPrix,
  prixParticipant,
} from "../lib/rules";

type ParticipantFormProps = {
  participant: Participant;
  index: number;
  canRemove: boolean;
  canSwitchToMiseEau: boolean;
  canSwitchToObservateur: boolean;
  responsableEmail: string;
  responsableTelephone: string;
  onParticipantChange: (
    index: number,
    field: keyof Participant,
    value: string | boolean
  ) => void;
  onParticipantAgeBlur: (index: number) => void;
  onEmailChange: (value: string) => void;
  onTelephoneChange: (value: string) => void;
  onRemove: (index: number) => void;
  t?: WhaleWatchingTranslations;
};

export function ParticipantForm({
  participant,
  index,
  canRemove,
  canSwitchToMiseEau,
  canSwitchToObservateur,
  responsableEmail,
  responsableTelephone,
  onParticipantChange,
  onParticipantAgeBlur,
  onEmailChange,
  onTelephoneChange,
  onRemove,
  t = whaleWatchingTranslations.fr,
}: ParticipantFormProps) {
  const isResponsable = index === 0;
  const showEquipment = participant.role === "mise_eau";
  const isUnderWaterTooYoung = ageRenseigneMineurComplet(participant.age);
  const canChooseMiseEau = canSwitchToMiseEau && !isUnderWaterTooYoung;

  function handleRoleChange(value: string) {
    if (value === "mise_eau" && isUnderWaterTooYoung) return;
    onParticipantChange(index, "role", value as Role);
  }

  function handleMaterialChange(checked: boolean) {
    onParticipantChange(index, "materielPerso", checked);
  }

  return (
    <article className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-[0_16px_38px_rgba(8,145,178,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(8,145,178,0.14)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">
            {t.participantForm.participant} {index + 1}
            {isResponsable ? ` (${t.participantForm.manager})` : ""}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {participant.role === "mise_eau"
              ? t.participantForm.waterEntry
              : t.participantForm.observer}
          </p>
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="min-h-11 rounded-2xl border border-red-100 px-4 text-sm font-black text-red-600"
          >
            {t.participantForm.remove}
          </button>
        )}
      </div>

      <div className="grid gap-3">
        <input
          placeholder={t.participantForm.firstName}
          value={participant.prenom}
          onChange={(event) =>
            onParticipantChange(index, "prenom", event.target.value)
          }
          className="min-h-14 touch-manipulation rounded-2xl border border-cyan-100 bg-cyan-50/60 px-4 text-base font-semibold outline-none transition focus:border-cyan-600 focus:bg-white"
        />

        <input
          placeholder={t.participantForm.lastName}
          value={participant.nom}
          onChange={(event) =>
            onParticipantChange(index, "nom", event.target.value)
          }
          className="min-h-14 touch-manipulation rounded-2xl border border-cyan-100 bg-cyan-50/60 px-4 text-base font-semibold outline-none transition focus:border-cyan-600 focus:bg-white"
        />

        {isResponsable && (
          <>
            <input
              type="tel"
              placeholder={t.participantForm.phone}
              value={responsableTelephone}
              onChange={(event) => onTelephoneChange(event.target.value)}
              className="min-h-14 touch-manipulation rounded-2xl border border-cyan-100 bg-cyan-50/60 px-4 text-base font-semibold outline-none transition focus:border-cyan-600 focus:bg-white"
            />

            <input
              type="email"
              placeholder={t.participantForm.email}
              value={responsableEmail}
              onChange={(event) => onEmailChange(event.target.value)}
              className="min-h-14 touch-manipulation rounded-2xl border border-cyan-100 bg-cyan-50/60 px-4 text-base font-semibold outline-none transition focus:border-cyan-600 focus:bg-white"
            />
          </>
        )}

        <input
          type="number"
          min="1"
          max="100"
          placeholder={t.participantForm.age}
          value={participant.age}
          onChange={(event) =>
            onParticipantChange(index, "age", event.target.value)
          }
          onBlur={() => onParticipantAgeBlur(index)}
          className="min-h-14 touch-manipulation rounded-2xl border border-cyan-100 bg-cyan-50/60 px-4 text-base font-semibold outline-none transition focus:border-cyan-600 focus:bg-white"
        />

        <select
          value={participant.role}
          onChange={(event) => handleRoleChange(event.target.value)}
          onInput={(event) => handleRoleChange(event.currentTarget.value)}
          onBlur={(event) => handleRoleChange(event.currentTarget.value)}
          className="min-h-14 touch-manipulation rounded-2xl border border-cyan-100 bg-cyan-50/60 px-4 text-base font-semibold outline-none transition focus:border-cyan-600 focus:bg-white"
        >
          <option value="mise_eau" disabled={!canChooseMiseEau}>
            {t.participantForm.waterEntry}
          </option>
          <option value="observateur" disabled={!canSwitchToObservateur}>
            {t.participantForm.observer}
          </option>
        </select>

        {isUnderWaterTooYoung && (
          <p className="rounded-2xl bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800">
            {t.participantForm.minimumAge}
          </p>
        )}
      </div>

      {participant.role === "mise_eau" && (
        <div className="mt-4 rounded-2xl bg-cyan-50 p-4">
          <label className="flex min-h-12 items-center gap-3 text-sm font-black text-cyan-950">
            <input
              type="checkbox"
              checked={participant.materielPerso}
              onChange={(event) => handleMaterialChange(event.target.checked)}
              onInput={(event) =>
                handleMaterialChange(event.currentTarget.checked)
              }
              onBlur={(event) => handleMaterialChange(event.currentTarget.checked)}
              className="h-6 w-6 touch-manipulation"
            />
            {t.participantForm.personalGear}
          </label>

          {showEquipment && (
            <div className="mt-3 grid gap-3">
              <select
                value={participant.tailleCombinaison}
                onChange={(event) =>
                  onParticipantChange(
                    index,
                    "tailleCombinaison",
                    event.target.value
                  )
                }
                className="min-h-14 touch-manipulation rounded-2xl border border-cyan-100 bg-white px-4 text-base font-semibold outline-none transition focus:border-cyan-600"
              >
                <option value="">{t.participantForm.wetsuitSize}</option>
                {TAILLES_COMBI.map((taille) => (
                  <option key={taille} value={taille}>
                    {taille}
                  </option>
                ))}
              </select>

              <select
                value={participant.pointurePalmes}
                onChange={(event) =>
                  onParticipantChange(
                    index,
                    "pointurePalmes",
                    event.target.value
                  )
                }
                className="min-h-14 touch-manipulation rounded-2xl border border-cyan-100 bg-white px-4 text-base font-semibold outline-none transition focus:border-cyan-600"
              >
                <option value="">{t.participantForm.finSize}</option>
                {POINTURES_PALMES.map((pointure) => (
                  <option key={pointure} value={pointure}>
                    {pointure}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-right text-lg font-black text-cyan-900">
        {formatPrix(prixParticipant(participant))}
      </p>
    </article>
  );
}
