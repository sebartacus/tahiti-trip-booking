import { MAX_MISE_EAU, MAX_OBSERVATEURS } from "../lib/rules";
import { BaleinesAvailabilityCalendar } from "./BaleinesAvailabilityCalendar";

type DateStepProps = {
  date: string;
  chargement: boolean;
  placesRestantesMiseEau: number;
  placesRestantesObservateur: number;
  onDateChange: (date: string) => void;
};

export function DateStep({
  date,
  chargement,
  placesRestantesMiseEau,
  placesRestantesObservateur,
  onDateChange,
}: DateStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black leading-tight text-slate-950">
          Choisissez votre date
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          Saison du 20 juillet 2026 au 20 novembre 2026.
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-black uppercase tracking-[0.14em] text-slate-600">
          <span className="mr-2">📅</span>Date de sortie
        </span>
        <div className="mt-2">
          <BaleinesAvailabilityCalendar
            selectedDate={date}
            onDateSelect={onDateChange}
          />
        </div>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
          <p className="text-sm font-bold text-cyan-900">Nageurs</p>
          <p className="mt-1 text-3xl font-black text-cyan-950">
            {chargement ? "..." : Math.max(0, placesRestantesMiseEau)}
            <span className="text-base">/{MAX_MISE_EAU}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-100 bg-white p-4">
          <p className="text-sm font-bold text-blue-900">Observateurs</p>
          <p className="mt-1 text-3xl font-black text-blue-950">
            {chargement ? "..." : Math.max(0, placesRestantesObservateur)}
            <span className="text-base">/{MAX_OBSERVATEURS}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
