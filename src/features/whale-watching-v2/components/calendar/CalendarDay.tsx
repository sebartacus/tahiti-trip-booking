import type { DayStatus } from "../../data/calendar";

type Props = {
  day: number;
  active: boolean;
  disabled: boolean;
  status?: DayStatus;
  waterRemaining?: number;
  observerRemaining?: number;
  onClick(): void;
};

const STATUS_STYLES: Record<
  DayStatus,
  {
    label: string;
    dot: string;
    meter: string;
    surface: string;
  }
> = {
  available: {
    label: "Ouvert",
    dot: "bg-emerald-400",
    meter: "bg-emerald-400",
    surface: "border-emerald-100 bg-white text-slate-950",
  },
  limited: {
    label: "Limite",
    dot: "bg-amber-400",
    meter: "bg-amber-400",
    surface: "border-amber-100 bg-white text-slate-950",
  },
  almost_full: {
    label: "Rare",
    dot: "bg-orange-400",
    meter: "bg-orange-400",
    surface: "border-orange-100 bg-white text-slate-950",
  },
  full: {
    label: "Complet",
    dot: "bg-rose-500",
    meter: "bg-rose-500",
    surface: "border-rose-100 bg-white text-slate-950",
  },
};

function getRemainingLabel(value: number | undefined, total: number) {
  if (value === undefined) return `--/${total}`;

  return `${value}/${total}`;
}

export function CalendarDay({
  day,
  active,
  disabled,
  status = "available",
  waterRemaining,
  observerRemaining,
  onClick,
}: Props) {
  const style = STATUS_STYLES[status];
  const waterLabel = getRemainingLabel(waterRemaining, 6);
  const observerLabel = getRemainingLabel(observerRemaining, 2);
  const waterPercent =
    waterRemaining === undefined ? 100 : (waterRemaining / 6) * 100;
  const observerPercent =
    observerRemaining === undefined ? 100 : (observerRemaining / 2) * 100;

  const stateClasses = disabled
    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-70"
    : active
    ? "scale-[1.03] border-cyan-300 bg-slate-950 text-white shadow-[0_16px_38px_rgba(8,145,178,0.34)] ring-2 ring-cyan-300 ring-offset-2 ring-offset-slate-50"
    : `${style.surface} shadow-sm hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md`;

  const secondaryText = active
    ? "text-cyan-50/80"
    : disabled
    ? "text-slate-400"
    : "text-slate-500";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={`group relative flex aspect-square min-h-0 w-full flex-col justify-between overflow-hidden rounded-[18px] border p-2 text-left transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-50 sm:rounded-[22px] sm:p-3 ${stateClasses}`}
    >
      <span
        className={`absolute right-2 top-2 h-2 w-2 rounded-full ${
          disabled ? "bg-slate-300" : style.dot
        }`}
      />

      {active && (
        <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200 to-transparent" />
      )}

      <div>
        <span className="block text-[clamp(1.15rem,6vw,2rem)] font-black leading-none sm:text-3xl">
          {day}
        </span>

        <span
          className={`mt-1 block truncate text-[9px] font-black uppercase tracking-[0.14em] sm:text-[10px] ${secondaryText}`}
        >
          {disabled ? "Ferme" : style.label}
        </span>
      </div>

      <div className="space-y-1">
        <div className="space-y-0.5">
          <div className={`flex items-center justify-between gap-1 text-[9px] font-bold sm:text-[10px] ${secondaryText}`}>
            <span>Nage</span>
            <span>{disabled ? "--/6" : waterLabel}</span>
          </div>

          <div className={active ? "h-1 rounded-full bg-white/15" : "h-1 rounded-full bg-slate-200"}>
            <div
              className={`h-full rounded-full ${
                disabled ? "bg-slate-300" : style.meter
              }`}
              style={{ width: `${waterPercent}%` }}
            />
          </div>
        </div>

        <div className="space-y-0.5">
          <div className={`flex items-center justify-between gap-1 text-[9px] font-bold sm:text-[10px] ${secondaryText}`}>
            <span>Bord</span>
            <span>{disabled ? "--/2" : observerLabel}</span>
          </div>

          <div className={active ? "h-1 rounded-full bg-white/15" : "h-1 rounded-full bg-slate-200"}>
            <div
              className={`h-full rounded-full ${
                disabled ? "bg-slate-300" : style.meter
              }`}
              style={{ width: `${observerPercent}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  );
}
