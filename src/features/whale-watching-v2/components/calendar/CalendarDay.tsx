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

const DOT_STYLES: Record<DayStatus, string> = {
  available: "bg-emerald-400",
  limited: "bg-orange-400",
  almost_full: "bg-orange-400",
  full: "bg-rose-500",
};

function getAvailabilityLabel(
  disabled: boolean,
  status: DayStatus,
  waterRemaining?: number,
  observerRemaining?: number
) {
  if (disabled) return "Hors saison";
  if (status === "full") return "Complet";
  if (status === "limited" || status === "almost_full") {
    return `Quelques places, ${waterRemaining ?? "--"} nageurs, ${
      observerRemaining ?? "--"
    } observateurs`;
  }

  return `Beaucoup de places, ${waterRemaining ?? "--"} nageurs, ${
    observerRemaining ?? "--"
  } observateurs`;
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
  const dotClass = disabled ? "bg-slate-300" : DOT_STYLES[status];
  const label = getAvailabilityLabel(
    disabled,
    status,
    waterRemaining,
    observerRemaining
  );

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={`${day}. ${label}`}
      aria-pressed={active}
      className="group flex h-[54px] w-full flex-col items-center justify-start gap-1 rounded-2xl pt-1 transition focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 disabled:cursor-not-allowed"
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black transition-all ${
          disabled
            ? "bg-slate-100 text-slate-300"
            : active
            ? "scale-105 bg-slate-950 text-white shadow-[0_12px_26px_rgba(15,23,42,0.25)] ring-2 ring-cyan-300"
            : "bg-white text-slate-800 ring-1 ring-slate-200 group-hover:bg-cyan-50 group-hover:ring-cyan-200"
        }`}
      >
        {day}
      </span>

      <span
        className={`h-1.5 w-1.5 rounded-full ${dotClass} ${
          active ? "scale-125" : ""
        }`}
      />
    </button>
  );
}
