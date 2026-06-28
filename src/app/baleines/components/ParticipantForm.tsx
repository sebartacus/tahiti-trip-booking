import type { Participant, Role } from "../lib/types";
import {
  afficherMateriel,
  POINTURES_PALMES,
  TAILLES_COMBI,
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
  onEmailChange: (value: string) => void;
  onTelephoneChange: (value: string) => void;
  onRemove: (index: number) => void;
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
  onEmailChange,
  onTelephoneChange,
  onRemove,
}: ParticipantFormProps) {
  const isResponsable = index === 0;
  const showEquipment = afficherMateriel(participant);

  function handleRoleChange(value: string) {
    onParticipantChange(index, "role", value as Role);
  }

  function handleMaterialChange(checked: boolean) {
    onParticipantChange(index, "materielPerso", checked);
  }

  return (
    <article className="rounded-[28px] border border-cyan-100 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">
            Participant {index + 1}
            {isResponsable ? " (Responsable)" : ""}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {participant.role === "mise_eau" ? "Mise a l'eau" : "Observateur"}
          </p>
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="min-h-11 rounded-2xl border border-red-100 px-4 text-sm font-black text-red-600"
          >
            Supprimer
          </button>
        )}
      </div>

      <div className="grid gap-3">
        <input
          placeholder="Prenom"
          value={participant.prenom}
          onChange={(event) =>
            onParticipantChange(index, "prenom", event.target.value)
          }
          className="min-h-14 touch-manipulation rounded-2xl border border-cyan-100 bg-white px-4 text-base font-semibold outline-none focus:border-cyan-500"
        />

        <input
          placeholder="Nom"
          value={participant.nom}
          onChange={(event) =>
            onParticipantChange(index, "nom", event.target.value)
          }
          className="min-h-14 touch-manipulation rounded-2xl border border-cyan-100 bg-white px-4 text-base font-semibold outline-none focus:border-cyan-500"
        />

        {isResponsable && (
          <>
            <input
              type="tel"
              placeholder="Telephone"
              value={responsableTelephone}
              onChange={(event) => onTelephoneChange(event.target.value)}
              className="min-h-14 touch-manipulation rounded-2xl border border-cyan-100 bg-white px-4 text-base font-semibold outline-none focus:border-cyan-500"
            />

            <input
              type="email"
              placeholder="Email"
              value={responsableEmail}
              onChange={(event) => onEmailChange(event.target.value)}
              className="min-h-14 touch-manipulation rounded-2xl border border-cyan-100 bg-white px-4 text-base font-semibold outline-none focus:border-cyan-500"
            />
          </>
        )}

        <input
          type="number"
          min="1"
          max="100"
          placeholder="Age"
          value={participant.age}
          onChange={(event) =>
            onParticipantChange(index, "age", event.target.value)
          }
          className="min-h-14 touch-manipulation rounded-2xl border border-cyan-100 bg-white px-4 text-base font-semibold outline-none focus:border-cyan-500"
        />

        <select
          value={participant.role}
          onChange={(event) => handleRoleChange(event.target.value)}
          onInput={(event) => handleRoleChange(event.currentTarget.value)}
          onBlur={(event) => handleRoleChange(event.currentTarget.value)}
          className="min-h-14 touch-manipulation rounded-2xl border border-cyan-100 bg-white px-4 text-base font-semibold outline-none focus:border-cyan-500"
        >
          <option value="mise_eau" disabled={!canSwitchToMiseEau}>
            Mise a l eau
          </option>
          <option value="observateur" disabled={!canSwitchToObservateur}>
            Observateur
          </option>
        </select>
      </div>

      {participant.role === "mise_eau" && (
        <div className="mt-4 rounded-[24px] bg-cyan-50 p-4">
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
            Materiel personnel
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
                className="min-h-14 touch-manipulation rounded-2xl border border-cyan-100 bg-white px-4 text-base font-semibold outline-none focus:border-cyan-500"
              >
                <option value="">Taille combinaison</option>
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
                className="min-h-14 touch-manipulation rounded-2xl border border-cyan-100 bg-white px-4 text-base font-semibold outline-none focus:border-cyan-500"
              >
                <option value="">Pointure palmes</option>
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
