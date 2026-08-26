import { NextResponse } from "next/server";
import { createSalonPublicAccessToken, isSalonIdentificationComplete, normalizeSalonReference, salonContactMatches } from "@/lib/salonPublicAccess";
import { buildSalonPublicOffer, findSalonPublicRightsByCode, findSalonPublicRightsByInvoice } from "@/lib/salonPublicOffers";
import { consumeSalonPublicAttempt, salonPublicClientIp } from "@/lib/salonPublicRateLimit";

const GENERIC_ERROR = "Offre introuvable ou informations incorrectes.";

export async function POST(request: Request) {
  const ip = salonPublicClientIp(request);
  if (!consumeSalonPublicAttempt(ip)) return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const reference = normalizeSalonReference(body.reference);
    const contactRaw = typeof body.contact === "string" ? body.contact : "";
    if (!isSalonIdentificationComplete(reference, contactRaw)) return NextResponse.json({ error: GENERIC_ERROR }, { status: 404 });

    const byCode = /^[A-F0-9]{20}$/.test(reference);
    const candidates = byCode ? await findSalonPublicRightsByCode(reference) : await findSalonPublicRightsByInvoice(reference);
    const matches = candidates.filter(({ sale }) => salonContactMatches(sale.client_telephone, sale.client_email, contactRaw));
    if (!matches.length) return NextResponse.json({ error: GENERIC_ERROR }, { status: 404 });

    const offers = await Promise.all(matches.map(async ({ activity, right, item, sale }) => ({
      token: createSalonPublicAccessToken({ activity, rightId: right.id, saleId: sale.id }),
      offer: await buildSalonPublicOffer(activity, right, item, sale),
    })));
    return NextResponse.json({ offers });
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 404 });
  }
}
