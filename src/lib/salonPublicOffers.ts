import "server-only";
import { getSalonAdminClient } from "@/lib/salonAdmin";
import type { SalonPublicAccessPayload, SalonPublicActivity } from "@/lib/salonPublicAccess";

type RightRow = Record<string, unknown> & { id: string; status: string; reservation_id?: string | null };
type SaleRow = {
  id: string; client_telephone: string; client_email: string | null;
  montant_total: number; montant_encaisse: number; montant_solde: number;
  facture_numero: string | null;
};

const rightTable: Record<SalonPublicActivity, string> = {
  baleines: "salon_baleines_rights",
  peche: "salon_peche_rights",
  charter: "salon_charter_rights",
};

export type SalonPublicOffer = {
  activity: SalonPublicActivity;
  label: string;
  status: string;
  validUntil: string;
  total: number;
  paid: number;
  balance: number;
  participants: number;
  composition?: Record<string, number>;
  formula?: string;
  offerType?: string;
  reservedDate?: string | null;
  reservedEndDate?: string | null;
  reservedSlot?: string | null;
};

async function itemAndSale(activity: SalonPublicActivity, right: RightRow) {
  const supabase = getSalonAdminClient();
  let itemQuery = supabase.from("salon_sale_items").select("id,sale_id,libelle,valid_until,offer_code").eq("activity", activity);
  if (activity === "baleines") itemQuery = itemQuery.eq("sale_id", String(right.sale_id));
  else itemQuery = itemQuery.eq("id", String(right.sale_item_id));
  const item = await itemQuery.maybeSingle();
  if (item.error || !item.data) return null;
  const sale = await supabase.from("salon_sales").select("id,client_telephone,client_email,montant_total,montant_encaisse,montant_solde,facture_numero").eq("id", item.data.sale_id).maybeSingle();
  if (sale.error || !sale.data) return null;
  return { item: item.data, sale: sale.data as SaleRow };
}

export async function findSalonPublicRight(activity: SalonPublicActivity, rightId: string) {
  const result = await getSalonAdminClient().from(rightTable[activity]).select("*").eq("id", rightId).maybeSingle();
  if (result.error || !result.data) return null;
  const linked = await itemAndSale(activity, result.data as RightRow);
  return linked ? { right: result.data as RightRow, ...linked } : null;
}

export async function findSalonPublicRightsByCode(code: string) {
  const supabase = getSalonAdminClient();
  const results = await Promise.all((Object.keys(rightTable) as SalonPublicActivity[]).map(async (activity) => {
    const right = await supabase.from(rightTable[activity]).select("*").eq("public_code", code).maybeSingle();
    if (right.error || !right.data) return null;
    const linked = await itemAndSale(activity, right.data as RightRow);
    return linked ? { activity, right: right.data as RightRow, ...linked } : null;
  }));
  return results.filter((value): value is NonNullable<typeof value> => Boolean(value));
}

export async function findSalonPublicRightsByInvoice(invoice: string) {
  const supabase = getSalonAdminClient();
  const sales = await supabase.from("salon_sales").select("id").ilike("facture_numero", invoice);
  if (sales.error || !sales.data?.length) return [];
  const saleIds = sales.data.map((sale) => sale.id);
  const items = await supabase.from("salon_sale_items").select("activity,reservation_type,reservation_id").in("sale_id", saleIds).in("activity", ["baleines", "peche", "charter"]);
  if (items.error) return [];
  const found = await Promise.all((items.data || []).map(async (item) => {
    const activity = item.activity as SalonPublicActivity;
    if (!activity || !item.reservation_id) return null;
    let rightId = item.reservation_type?.startsWith("salon_") ? item.reservation_id : "";
    if (!rightId && item.reservation_type?.startsWith("reservations_")) {
      const right = await supabase.from(rightTable[activity]).select("id").eq("reservation_id", item.reservation_id).maybeSingle();
      rightId = right.data?.id || "";
    }
    if (!rightId) return null;
    const value = await findSalonPublicRight(activity, rightId);
    return value ? { activity, ...value } : null;
  }));
  return found.filter((value): value is NonNullable<typeof value> => Boolean(value));
}

export async function buildSalonPublicOffer(activity: SalonPublicActivity, right: RightRow, item: Record<string, unknown>, sale: SaleRow): Promise<SalonPublicOffer> {
  let reservedDate: string | null = null, reservedEndDate: string | null = null, reservedSlot: string | null = null;
  if (right.reservation_id) {
    const table = activity === "baleines" ? "reservations_baleines" : activity === "peche" ? "reservations_peche" : "reservations_charter";
    const columns = activity === "baleines" ? "date_sortie,depart" : activity === "peche" ? "date_sortie,slots" : "date_debut,date_fin";
    const reservation = await getSalonAdminClient().from(table).select(columns).eq("id", right.reservation_id).maybeSingle();
    if (reservation.data) {
      const row = reservation.data as Record<string, unknown>;
      reservedDate = String(row.date_sortie || row.date_debut || "") || null;
      reservedEndDate = String(row.date_fin || "") || null;
      reservedSlot = Array.isArray(row.slots) ? row.slots.join(" + ") : String(row.depart || "") || null;
    }
  }
  const composition = activity === "baleines" ? right.composition as Record<string, number> : undefined;
  const participants = composition ? Object.values(composition).reduce((sum, count) => sum + Number(count), 0) : Number(right.nombre_personnes || 0);
  return {
    activity,
    label: String(item.libelle || "Offre Salon"),
    status: right.status,
    validUntil: String(right.valid_until || item.valid_until || ""),
    total: Number(sale.montant_total), paid: Number(sale.montant_encaisse), balance: Number(sale.montant_solde),
    participants, composition,
    formula: activity === "peche" ? String(right.formule || "") : undefined,
    offerType: activity === "peche" ? String(right.offer_type || "") : undefined,
    reservedDate, reservedEndDate, reservedSlot,
  };
}

export async function loadAuthorizedSalonOffer(payload: SalonPublicAccessPayload) {
  const found = await findSalonPublicRight(payload.activity, payload.rightId);
  if (!found || found.sale.id !== payload.saleId) return null;
  return { ...found, offer: await buildSalonPublicOffer(payload.activity, found.right, found.item, found.sale) };
}
