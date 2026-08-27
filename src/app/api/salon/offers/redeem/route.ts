import { NextResponse } from "next/server";
import { getSalonAdminClient } from "@/lib/salonAdmin";
import { getCharterSlotRequirements, isValidIsoDate } from "@/lib/charter-availability";
import { validateSalonBaleinesParticipants } from "@/lib/salonBaleinesParticipants";
import type { SalonBaleinesCategory } from "@/lib/salonBaleines";
import { loadAuthorizedSalonOffer } from "@/lib/salonPublicOffers";
import { verifySalonPublicAccessToken } from "@/lib/salonPublicAccess";
import { sendSalonRedemptionNotification } from "@/lib/salonRedemptionNotification";

function bearer(request: Request) { const value=request.headers.get("authorization")||""; return value.startsWith("Bearer ")?value.slice(7):""; }
const text=(value:unknown)=>typeof value==="string"?value.trim():"";

export async function POST(request: Request) {
  const payload = verifySalonPublicAccessToken(bearer(request));
  if (!payload) return NextResponse.json({ error: "Accès expiré. Retrouvez de nouveau votre offre." }, { status: 401 });
  try {
    const body=await request.json() as Record<string,unknown>;
    if (["rightId","saleId","total","paid","balance","price","montant_total","montant_encaisse","montant_solde"].some(key=>key in body)) return NextResponse.json({error:"Données de réservation invalides."},{status:400});
    const authorized=await loadAuthorizedSalonOffer(payload);
    if(!authorized)return NextResponse.json({error:"Offre introuvable."},{status:404});
    if(authorized.right.status!=="unused")return NextResponse.json({error:"Cette offre a déjà été réservée.",offer:authorized.offer},{status:409});
    const date=text(body.date),slot=text(body.slot);
    if(!isValidIsoDate(date)||date>authorized.offer.validUntil)return NextResponse.json({error:"Date hors validité."},{status:400});
    const supabase=getSalonAdminClient(); let rpc;
    if(payload.activity==="baleines"){
      const participants=validateSalonBaleinesParticipants(body.participants,authorized.right.composition as Record<SalonBaleinesCategory,number>);
      rpc=await supabase.rpc("redeem_salon_baleines_right",{p_right_id:payload.rightId,p_date_sortie:date,p_depart:slot,p_participants:participants});
    }else if(payload.activity==="peche"){
      rpc=await supabase.rpc("redeem_salon_peche_right",{p_right_id:payload.rightId,p_date_sortie:date,p_depart:slot});
    }else{
      const requiredSlots=getCharterSlotRequirements("tetiaroa_2j_1n",date).requiredSlots;
      rpc=await supabase.rpc("redeem_salon_charter_right",{p_right_id:payload.rightId,p_date_debut:date,p_requested_slots:requiredSlots});
    }
    if(rpc.error){const already=/droit .*indisponible|utilis|redeem/i.test(rpc.error.message);const conflict=/conflit|indisponible|capacit|occupe/i.test(rpc.error.message);return NextResponse.json({error:already?"Cette offre a déjà été réservée.":conflict?"Cette date n’est plus disponible.":"La réservation n’a pas pu être confirmée."},{status:already||conflict?409:400});}
    const reservationId=String(rpc.data||"");
    try {
      const table=payload.activity==="baleines"?"reservations_baleines":payload.activity==="peche"?"reservations_peche":"reservations_charter";
      const reservation=await supabase.from(table).select("id").eq("id",reservationId).maybeSingle();
      if(reservation.error||!reservation.data)throw new Error(`Réservation ${reservationId} introuvable après redemption`);
      const endDate=payload.activity==="charter"?getCharterSlotRequirements("tetiaroa_2j_1n",date).endDate:undefined;
      const notification=await sendSalonRedemptionNotification({activity:payload.activity,reservationId,firstName:authorized.sale.client_prenom,lastName:authorized.sale.client_nom,phone:authorized.sale.client_telephone,email:authorized.sale.client_email,offer:String(authorized.item.libelle||authorized.offer.label),date,endDate,slot:payload.activity==="charter"?undefined:slot,participants:authorized.offer.participants,composition:authorized.offer.composition,invoiceNumber:authorized.sale.facture_numero,total:authorized.sale.montant_total,paid:authorized.sale.montant_encaisse,balance:authorized.sale.montant_solde,paymentMethod:authorized.sale.payment_method,formula:authorized.offer.formula,offerType:authorized.offer.offerType});
      if("error" in notification||"skipped" in notification)console.error("Notification interne réservation Salon non envoyée",notification);
    } catch (notificationError) {
      console.error("Échec notification interne réservation Salon",notificationError);
    }
    return NextResponse.json({ok:true,reservationId,date,slot:payload.activity==="charter"?null:slot},{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"La réservation n’a pas pu être confirmée."},{status:400});}
}
