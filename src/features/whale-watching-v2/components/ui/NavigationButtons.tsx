"use client";

type Props = {
  previous(): void;
  next(): void;
  disablePrevious: boolean;
  disableNext: boolean;
};

export function NavigationButtons({
  previous,
  next,
  disablePrevious,
  disableNext,
}: Props) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-slate-950/92 px-4 pb-5 pt-3 shadow-[0_-18px_50px_rgba(15,23,42,0.26)] backdrop-blur-xl">
      <div className="mx-auto mb-3 h-1 w-28 rounded-full bg-white/15" />

      <div className="grid grid-cols-[0.78fr_1.22fr] gap-3">
        <button
          type="button"
          onClick={previous}
          disabled={disablePrevious}
          className="min-h-14 rounded-[22px] border border-white/10 bg-white/10 px-4 text-base font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
        >
          Retour
        </button>

        <button
          type="button"
          onClick={next}
          disabled={disableNext}
          className="min-h-14 rounded-[22px] bg-gradient-to-r from-cyan-300 to-sky-400 px-5 text-base font-black text-slate-950 shadow-[0_16px_40px_rgba(14,165,233,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(14,165,233,0.45)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
