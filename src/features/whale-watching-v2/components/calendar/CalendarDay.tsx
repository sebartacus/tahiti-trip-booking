type Props = {
  day: number;
  active: boolean;
  disabled: boolean;
  status?: "available" | "limited" | "almost_full" | "full";
  waterRemaining?: number;
  observerRemaining?: number;
  onClick(): void;
};

export function CalendarDay({
  day,
  active,
  disabled,
  status = "available",
  waterRemaining,
  observerRemaining,
  onClick,
}: Props) {
  const badge =
    status === "available"
      ? "bg-emerald-500"
      : status === "limited"
      ? "bg-yellow-400"
      : status === "almost_full"
      ? "bg-orange-500"
      : "bg-red-500";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group relative flex aspect-square flex-col justify-between rounded-2xl border p-3 transition-all duration-300

      ${
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
          : active
          ? "scale-105 border-cyan-500 bg-cyan-50 shadow-lg"
          : "border-slate-200 bg-white hover:-translate-y-1 hover:border-cyan-300 hover:shadow-lg"
      }`}
    >
      {!disabled && (
        <div
          className={`absolute right-3 top-3 h-3 w-3 rounded-full ${badge}`}
        />
      )}

      <div className="text-left">
        <div className="text-xl font-bold text-slate-800">
          {day}
        </div>
      </div>

      {!disabled && (
        <div className="space-y-1 text-left text-[11px]">

          <div className="flex items-center justify-between">
            <span>🥽</span>
            <strong>{waterRemaining ?? "-"}</strong>
          </div>

          <div className="flex items-center justify-between">
            <span>🔭</span>
            <strong>{observerRemaining ?? "-"}</strong>
          </div>

        </div>
      )}
    </button>
  );
}