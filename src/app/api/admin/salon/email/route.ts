import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getSalonAdminClient } from "@/lib/salonAdmin";
import { sendResendEmail } from "@/lib/baleinesEmail";
import { buildSalonInvoiceAttachment, buildSalonInvoiceEmail } from "@/lib/salonInvoiceEmail";

export async function POST(request: Request) {
  if (!verifyAdminSession(request))
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  const body = (await request.json()) as { id?: unknown };
  const id = typeof body.id === "string" ? body.id : "";
  const supabase = getSalonAdminClient();
  const sale = await supabase
    .from("salon_sales")
    .select(
      "id,client_prenom,client_nom,client_email,montant_solde,facture_numero,facture_url,salon_sale_items(activity,libelle,reservation_type,reservation_id,valid_until,total_price)",
    )
    .eq("id", id)
    .single();
  const item = Array.isArray(sale.data?.salon_sale_items)
    ? sale.data.salon_sale_items[0]
    : sale.data?.salon_sale_items;
  if (sale.error || !sale.data) return NextResponse.json({error:"Vente Salon introuvable."},{status:404});
  if (!sale.data.client_email) return NextResponse.json({error:"E-mail client non renseigné."},{status:400});
  if (!sale.data.facture_url || !sale.data.facture_numero) return NextResponse.json({error:"Aucune facture existante à envoyer."},{status:409});
  if (!item) return NextResponse.json({error:"Prestation Salon introuvable."},{status:404});
  const file = await supabase.storage
    .from("documents-permis")
    .download(sale.data.facture_url);
  if (file.error || !file.data)
    return NextResponse.json(
      { error: "Impossible de préparer l’e-mail." },
      { status: 500 },
    );
  const invoicePdf = Buffer.from(await file.data.arrayBuffer());
  let attachment;
  try { attachment=buildSalonInvoiceAttachment(invoicePdf,sale.data.facture_numero); } catch { return NextResponse.json({error:"Le document stocké n’est pas une facture PDF valide."},{status:500}); }
  const invoiceEmail=buildSalonInvoiceEmail({firstName:sale.data.client_prenom,activity:item.activity,offer:item.libelle,bookLater:item.reservation_type.startsWith("salon_"),balance:Number(sale.data.montant_solde||0)});
  const invoiceResult=await sendResendEmail({from:process.env.EMAIL_FROM||"Tahiti Trip Fishing <onboarding@resend.dev>",to:[sale.data.client_email],subject:invoiceEmail.subject,html:invoiceEmail.html,attachments:[attachment]},fetch,`salon-invoice-${id}`);
  if(!("ok" in invoiceResult)||!invoiceResult.ok)return NextResponse.json({error:"Impossible d’envoyer la facture. Vous pouvez réessayer."},{status:502});
  const invoiceSentAt=new Date().toISOString();
  const invoiceUpdate=await supabase.from("salon_sales").update({facture_envoyee_at:invoiceSentAt}).eq("id",id);
  if(invoiceUpdate.error)return NextResponse.json({error:"Facture envoyée, mais le statut d’envoi n’a pas pu être enregistré."},{status:500});
  return NextResponse.json({ok:true,sentAt:invoiceSentAt});
}
