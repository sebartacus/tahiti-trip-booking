import { NextResponse } from "next/server";
import {
  getCharterAvailabilityConflicts,
  getCharterSlotRequirements,
  isCharterFormula,
  isValidIsoDate,
  type CharterCalendarSlot,
} from "@/lib/charter-availability";
import { supabase } from "@/lib/supabase";

const SELECT_FIELDS = "date,slot,status,activity,expires_at";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const formula = searchParams.get("formule");
  const startDate = searchParams.get("date_debut");

  if (!isCharterFormula(formula)) {
    return NextResponse.json(
      { error: "Formule Charter invalide." },
      { status: 400 }
    );
  }

  if (!isValidIsoDate(startDate)) {
    return NextResponse.json(
      { error: "date_debut requise au format YYYY-MM-DD." },
      { status: 400 }
    );
  }

  const { endDate, requiredSlots } = getCharterSlotRequirements(
    formula,
    startDate
  );
  const { data, error } = await supabase
    .from("boat_calendar_slots")
    .select(SELECT_FIELDS)
    .gte("date", startDate)
    .lte("date", endDate)
    .in("slot", ["morning", "afternoon"])
    .order("date", { ascending: true })
    .order("slot", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Impossible de verifier la disponibilite Charter." },
      { status: 500 }
    );
  }

  const conflicts = getCharterAvailabilityConflicts(
    requiredSlots,
    (data || []) as CharterCalendarSlot[],
    new Date()
  );

  return NextResponse.json({
    available: conflicts.length === 0,
    formula,
    date_debut: startDate,
    date_fin: endDate,
    required_slots: requiredSlots,
    conflicts,
  });
}
