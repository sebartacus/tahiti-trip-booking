import type { Depart } from "../lib/types";

type DepartureStepProps = {
  depart: Depart;
  availability: Record<Depart, boolean>;
  capacities: Record<
    Depart,
    {
      miseEau: number;
      observateurs: number;
    }
  >;
  onDepartChange: (depart: Depart) => void;
};

const departures: Array<{ value: Depart; title: string; label: string }> = [
  { value: "07:00", title: "07:00", label: "Départ matin" },
  { value: "13:15", title: "13:15", label: "Départ après-midi" },
];

export function DepartureStep({
  depart,
  availability,
  capacities,
  onDepartChange,
}: DepartureStepProps) {
  function selectDepart(value: Depart) {
    if (!availability[value]) return;
    onDepartChange(value);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black leading-tight text-slate-950">
          Choisissez votre départ
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          Deux horaires, une sortie en petit comité.
        </p>
      </div>

      <div className="grid gap-3">
        {departures.map((item) => {
          const selected = item.value === depart;
          const available = availability[item.value];
          const active = selected && available;
          const capacity = capacities[item.value];

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => selectDepart(item.value)}
              onPointerUp={(event) => {
                if (event.pointerType !== "mouse") selectDepart(item.value);
              }}
              disabled={!available}
              className={[
                "min-h-[112px] w-full rounded-2xl border px-5 text-left shadow-sm transition duration-300",
                active
                  ? "border-cyan-700 bg-cyan-700 text-white shadow-[0_14px_28px_rgba(8,145,178,0.18)]"
                  : "border-cyan-100 bg-white text-slate-950 hover:-translate-y-0.5 hover:border-cyan-300",
                available
                  ? "cursor-pointer"
                  : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500 opacity-70",
              ].join(" ")}
            >
              <span className="block text-4xl font-black">{item.title}</span>
              <span
                className={[
                  "mt-2 block text-sm font-black uppercase tracking-[0.14em]",
                  active ? "text-cyan-50" : "text-cyan-700",
                ].join(" ")}
              >
                {item.value === "07:00" ? "🌅 " : "🌇 "}
                {item.label}
              </span>
              <span
                className={[
                  "mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase",
                  available
                    ? active
                      ? "bg-white/20 text-white"
                      : "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700",
                ].join(" ")}
              >
                {available ? "Disponible" : "Complet"}
              </span>
              <div
                className={[
                  "mt-3 grid grid-cols-2 gap-2 text-xs font-black",
                  active ? "text-white" : "text-slate-700",
                ].join(" ")}
              >
                <span className="rounded-xl bg-white/70 px-3 py-2 text-slate-800">
                  {capacity.miseEau}/6 nageurs
                </span>
                <span className="rounded-xl bg-white/70 px-3 py-2 text-slate-800">
                  {capacity.observateurs}/2 observateurs
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
