import { NextResponse } from "next/server";
import {
  addUtcDays,
  getCharterAvailabilityConflicts,
  getCharterFormulaDuration,
  getCharterSlotRequirements,
  isCharterFormula,
  type CharterCalendarSlot,
} from "@/lib/charter-availability";
import { supabase } from "@/lib/supabase";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const SELECT_FIELDS = "date,slot,status,activity,expires_at";

function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = `${month}-01`;
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { first, last: `${month}-${String(lastDay).padStart(2, "0")}`, lastDay };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const formula = searchParams.get("formule");
  const month = searchParams.get("mois");

  if (!isCharterFormula(formula)) {
    return NextResponse.json({ error: "Formule Charter invalide." }, { status: 400 });
  }
  if (!month || !MONTH_PATTERN.test(month)) {
    return NextResponse.json({ error: "mois requis au format YYYY-MM." }, { status: 400 });
  }

  const bounds = monthBounds(month);
  const queryEnd = addUtcDays(bounds.last, getCharterFormulaDuration(formula) - 1);
  const { data, error } = await supabase
    .from("boat_calendar_slots")
    .select(SELECT_FIELDS)
    .gte("date", bounds.first)
    .lte("date", queryEnd)
    .in("slot", ["morning", "afternoon"])
    .order("date", { ascending: true })
    .order("slot", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Impossible de charger les disponibilites Charter." },
      { status: 500 }
    );
  }

  const calendarSlots = (data || []) as CharterCalendarSlot[];
  const now = new Date();
  const days = Array.from({ length: bounds.lastDay }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, "0")}`;
    const { endDate, requiredSlots } = getCharterSlotRequirements(formula, date);
    const conflicts = getCharterAvailabilityConflicts(requiredSlots, calendarSlots, now);
    return { date, date_fin: endDate, available: conflicts.length === 0 };
  });

  return NextResponse.json({ formula, month, days });
}
