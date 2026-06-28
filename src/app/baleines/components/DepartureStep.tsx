import type { Depart } from "../lib/types";

type DepartureStepProps = {
  depart: Depart;
  onDepartChange: (depart: Depart) => void;
};

const departures: Array<{ value: Depart; title: string; label: string }> = [
  { value: "07:00", title: "07:00", label: "Depart matin" },
  { value: "13:15", title: "13:15", label: "Depart apres-midi" },
];

export function DepartureStep({ depart, onDepartChange }: DepartureStepProps) {
  function selectDepart(value: Depart) {
    onDepartChange(value);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black leading-tight text-slate-950">
          Choisis ton depart
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          Deux horaires, une sortie en petit comite.
        </p>
      </div>

      <div className="grid gap-3">
        {departures.map((item) => {
          const selected = item.value === depart;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => selectDepart(item.value)}
              onPointerUp={(event) => {
                if (event.pointerType !== "mouse") selectDepart(item.value);
              }}
              className={[
                "min-h-[112px] w-full rounded-[28px] border px-5 text-left transition-colors",
                selected
                  ? "border-cyan-600 bg-cyan-600 text-white shadow-[0_16px_34px_rgba(8,145,178,0.25)]"
                  : "border-cyan-100 bg-white text-slate-950",
              ].join(" ")}
            >
              <span className="block text-4xl font-black">{item.title}</span>
              <span
                className={[
                  "mt-2 block text-sm font-black uppercase tracking-[0.14em]",
                  selected ? "text-cyan-50" : "text-cyan-700",
                ].join(" ")}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
