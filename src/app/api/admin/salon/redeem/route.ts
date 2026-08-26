import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getSalonAdminClient } from "@/lib/salonAdmin";
import { getCharterSlotRequirements, isValidIsoDate } from "@/lib/charter-availability";
import { validateSalonBaleinesParticipants } from "@/lib/salonBaleinesParticipants";
import type { SalonBaleinesCategory } from "@/lib/salonBaleines";

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

export async function POST(request: Request) {
  if (!verifyAdminSession(request)) return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const activity = text(body.activity), rightId = text(body.rightId), date = text(body.date), slot = text(body.slot);
    if (!rightId || !isValidIsoDate(date)) return NextResponse.json({ error: "Droit ou date invalide." }, { status: 400 });
    const supabase = getSalonAdminClient();
    let rpc;
    if (activity === "baleines") {
      const right = await supabase.from("salon_baleines_rights").select("composition,status,valid_until").eq("id", rightId).single();
      if (right.error || !right.data || right.data.status !== "unused") return NextResponse.json({ error: "Droit Baleines indisponible." }, { status: 409 });
      const participants = validateSalonBaleinesParticipants(body.participants, right.data.composition as Record<SalonBaleinesCategory, number>);
      rpc = await supabase.rpc("redeem_salon_baleines_right", { p_right_id: rightId, p_date_sortie: date, p_depart: slot, p_participants: participants });
    } else if (activity === "peche") {
      rpc = await supabase.rpc("redeem_salon_peche_right", { p_right_id: rightId, p_date_sortie: date, p_depart: slot });
    } else if (activity === "charter") {
      const requiredSlots = getCharterSlotRequirements("tetiaroa_2j_1n", date).requiredSlots;
      rpc = await supabase.rpc("redeem_salon_charter_right", { p_right_id: rightId, p_date_debut: date, p_requested_slots: requiredSlots });
    } else return NextResponse.json({ error: "Activité non planifiable." }, { status: 400 });
    if (rpc.error) {
      const conflict = /indisponible|conflit|capacit|utilis|validit/i.test(rpc.error.message);
      return NextResponse.json({ error: rpc.error.message }, { status: conflict ? 409 : 400 });
    }
    return NextResponse.json({ reservationId: rpc.data, date, slot: activity === "charter" ? null : slot }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Planification impossible." }, { status: 400 });
  }
}
