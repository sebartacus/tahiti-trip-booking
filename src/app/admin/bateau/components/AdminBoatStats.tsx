import type { BoatCalendarSlot } from "@/lib/boat-calendar";
import type { CalendarCell } from "./AdminBoatCalendar";

type AdminBoatStatsProps = {
  cells: CalendarCell[];
  daysInMonth: number;
};

export function AdminBoatStats({ cells, daysInMonth }: AdminBoatStatsProps) {
  const monthSlots = cells
    .filter((cell) => cell.inMonth)
    .flatMap((cell) => [cell.slots.morning, cell.slots.afternoon])
    .filter(Boolean) as BoatCalendarSlot[];

  const baleines = monthSlots.filter(
    (slot) => slot.activity === "baleines"
  ).length;
  const peche = monthSlots.filter((slot) => slot.activity === "peche").length;
  const pecheNuit = monthSlots.filter(
    (slot) => slot.activity === "peche_nuit"
  ).length;
  const blocked = monthSlots.filter((slot) => slot.status === "blocked").length;
  const unavailable = monthSlots.filter(
    (slot) => slot.status !== "available"
  ).length;
  const available = daysInMonth * 2 - unavailable;

  return (
    <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
      <StatCard
        label="Disponible"
        value={available}
        className="bg-emerald-50 text-emerald-950"
      />
      <StatCard
        label="Baleines"
        value={baleines}
        className="bg-blue-50 text-blue-950"
      />
      <StatCard
        label="Peche"
        value={peche}
        className="bg-orange-50 text-orange-950"
      />
      <StatCard
        label="Peche nuit"
        value={pecheNuit}
        className="bg-violet-50 text-violet-950"
      />
      <StatCard
        label="Bloques"
        value={blocked}
        className="bg-red-50 text-red-950"
      />
    </section>
  );
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`rounded-[24px] p-4 ${className}`}>
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.12em]">
        {label}
      </p>
    </div>
  );
}
