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
    <div className="mb-8">

      <div className="mb-3 flex items-center justify-between">

        <span className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-600">
          Progression
        </span>

        <span className="text-sm font-bold text-slate-600">
          {current}/{total}
        </span>

      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-200">

        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 transition-all duration-500"
          style={{
            width: `${progress}%`,
          }}
        />

      </div>

    </div>
  );
}