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
    <section className="whale-step-enter rounded-[34px] bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-600">
            Etape {step} sur {totalSteps}
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            Reservation guidee
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
          {step}
        </div>
      </div>

      {children}
    </section>
  );
}
