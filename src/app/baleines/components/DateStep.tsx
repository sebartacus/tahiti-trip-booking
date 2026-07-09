import type { WhaleWatchingTranslations } from "@/lib/i18n";
import { whaleWatchingTranslations } from "@/lib/i18n";
import { MAX_MISE_EAU, MAX_OBSERVATEURS } from "../lib/rules";
import { BaleinesAvailabilityCalendar } from "./BaleinesAvailabilityCalendar";

type DateStepProps = {
  date: string;
  chargement: boolean;
  placesRestantesMiseEau: number;
  placesRestantesObservateur: number;
  onDateChange: (date: string) => void;
  t?: WhaleWatchingTranslations;
};

export function DateStep({
  date,
  chargement,
  placesRestantesMiseEau,
  placesRestantesObservateur,
  onDateChange,
  t = whaleWatchingTranslations.fr,
}: DateStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black leading-tight text-slate-950">
          {t.dateStep.title}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          {t.dateStep.season}
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-black uppercase tracking-[0.14em] text-slate-600">
          <span className="mr-2">📅</span>
          {t.dateStep.label}
        </span>
        <div className="mt-2">
          <BaleinesAvailabilityCalendar
            selectedDate={date}
            onDateSelect={onDateChange}
            t={t}
          />
        </div>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
          <p className="text-sm font-bold text-cyan-900">
            {t.dateStep.swimmers}
          </p>
          <p className="mt-1 text-3xl font-black text-cyan-950">
            {chargement ? "..." : Math.max(0, placesRestantesMiseEau)}
            <span className="text-base">/{MAX_MISE_EAU}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-100 bg-white p-4">
          <p className="text-sm font-bold text-blue-900">
            {t.dateStep.observers}
          </p>
          <p className="mt-1 text-3xl font-black text-blue-950">
            {chargement ? "..." : Math.max(0, placesRestantesObservateur)}
            <span className="text-base">/{MAX_OBSERVATEURS}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
