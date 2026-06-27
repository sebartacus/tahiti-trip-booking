import { ReactNode } from "react";

type Props = {
  step: number;
  totalSteps: number;
  children: ReactNode;
};

export function StepLayout({
  step,
  totalSteps,
  children,
}: Props) {
  return (
    <section className="rounded-[32px] bg-white p-6 shadow-xl ring-1 ring-slate-200/70 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-600">
            Étape {step} / {totalSteps}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Assistant de réservation
          </p>
        </div>

        <div className="rounded-full bg-cyan-100 px-4 py-2 text-sm font-bold text-cyan-700">
          🐋 Whale Watching
        </div>
      </div>

      {children}
    </section>
  );
}