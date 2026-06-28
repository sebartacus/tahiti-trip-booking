import { MAX_MISE_EAU, MAX_OBSERVATEURS, SAISON_DEBUT, SAISON_FIN } from "../lib/rules";

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
  function handleDateInput(value: string) {
    onDateChange(value);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black leading-tight text-slate-950">
          Choisis ta date
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          Saison du 20 juillet 2026 au 20 novembre 2026.
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-black text-slate-800">Date de sortie</span>
        <div className="relative mt-2">
          <input
            type="date"
            min={SAISON_DEBUT}
            max={SAISON_FIN}
            value={date}
            onChange={(event) => handleDateInput(event.currentTarget.value)}
            onInput={(event) => handleDateInput(event.currentTarget.value)}
            onBlur={(event) => handleDateInput(event.currentTarget.value)}
            className="min-h-14 w-full touch-manipulation appearance-none rounded-2xl border border-cyan-100 bg-white px-4 py-3 pr-12 text-base font-bold text-slate-950 outline-none focus:border-cyan-500"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-cyan-700"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </div>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-cyan-50 p-4">
          <p className="text-sm font-bold text-cyan-900">Nageurs</p>
          <p className="mt-1 text-3xl font-black text-cyan-950">
            {chargement ? "..." : Math.max(0, placesRestantesMiseEau)}
            <span className="text-base">/{MAX_MISE_EAU}</span>
          </p>
        </div>

        <div className="rounded-3xl bg-blue-50 p-4">
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
