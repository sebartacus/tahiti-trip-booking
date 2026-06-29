import type { BoatCalendarSlot, BoatSlot } from "@/lib/boat-calendar";
import type { CalendarCell } from "./AdminBoatCalendar";

type AdminBoatDayProps = {
  cell: CalendarCell;
  selected: boolean;
  onSelect: (date: string) => void;
};

const slotLabels: Record<BoatSlot, string> = {
  morning: "Matin",
  afternoon: "Aprem",
};

function getSlotStyle(slot: BoatCalendarSlot | undefined) {
  if (!slot || slot.status === "available") {
    return "bg-emerald-100 text-emerald-950";
  }

  if (slot.status === "blocked") {
    return "bg-red-100 text-red-950";
  }

  if (slot.activity === "baleines") {
    return "bg-blue-100 text-blue-950";
  }

  if (slot.activity === "peche") {
    return "bg-orange-100 text-orange-950";
  }

  if (slot.activity === "peche_nuit") {
    return "bg-violet-100 text-violet-950";
  }

  return "bg-slate-100 text-slate-950";
}

function getSlotLabel(slotName: BoatSlot, slot: BoatCalendarSlot | undefined) {
  if (!slot || slot.status === "available") return slotLabels[slotName];
  if (slot.status === "blocked") return "Bloque";
  if (slot.activity === "baleines") return "Baleines";
  if (slot.activity === "peche") return "Peche";
  if (slot.activity === "peche_nuit") return "Nuit";
  return slot.status;
}

export function AdminBoatDay({ cell, selected, onSelect }: AdminBoatDayProps) {
  if (!cell.inMonth) {
    return <div className="min-h-[88px] rounded-2xl" />;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.date)}
      className={[
        "min-h-[88px] rounded-2xl border border-cyan-100 bg-white p-1 text-left transition sm:min-h-[112px] sm:p-2",
        selected ? "ring-2 ring-cyan-600 ring-offset-2" : "",
      ].join(" ")}
    >
      <span className="block text-sm font-black text-slate-950 sm:text-lg">
        {cell.dayNumber}
      </span>
      <span
        className={[
          "mt-1 block truncate rounded-lg px-1.5 py-1 text-[9px] font-black uppercase leading-tight sm:text-[11px]",
          getSlotStyle(cell.slots.morning),
        ].join(" ")}
      >
        {getSlotLabel("morning", cell.slots.morning)}
      </span>
      <span
        className={[
          "mt-1 block truncate rounded-lg px-1.5 py-1 text-[9px] font-black uppercase leading-tight sm:text-[11px]",
          getSlotStyle(cell.slots.afternoon),
        ].join(" ")}
      >
        {getSlotLabel("afternoon", cell.slots.afternoon)}
      </span>
    </button>
  );
}
