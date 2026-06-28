"use client";

type Props = {
  current: number;
  total: number;
};

export function ProgressBar({
  current,
  total,
}: Props) {
  const progress = (current / total) * 100;

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/70">
          Progression
        </span>

        <span className="text-xs font-black text-cyan-50">
          {Math.round(progress)}%
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300 shadow-[0_0_24px_rgba(103,232,249,0.55)] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1">
        {Array.from({ length: total }).map((_, index) => (
          <div
            key={index}
            className={`h-1 rounded-full transition-colors duration-300 ${
              index < current ? "bg-cyan-200" : "bg-white/10"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
