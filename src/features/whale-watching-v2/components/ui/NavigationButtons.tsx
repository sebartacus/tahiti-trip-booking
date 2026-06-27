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
    <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-8">

      <button
        type="button"
        onClick={previous}
        disabled={disablePrevious}
        className="rounded-2xl border border-slate-300 bg-white px-8 py-4 font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-30"
      >
        ← Précédent
      </button>

      <button
        type="button"
        onClick={next}
        disabled={disableNext}
        className="rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 px-10 py-4 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-30"
      >
        Suivant →
      </button>

    </div>
  );
}