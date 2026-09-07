import { NextResponse } from "next/server";
import { PERMIS_COOKIE, permisClientKey, permisCookieOptions, validPermisOrigin } from "@/lib/permisCandidateAccess";
import { permisAccessDependencies, requestPermisAccess, verifyPermisAccess } from "@/lib/permisServer";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  // Additive foundation: no active page uses this route and it is disabled by default.
  if (process.env.PERMIS_REPRISE_ACCESS_ENABLED !== "true") return NextResponse.json({ error: "Service indisponible." }, { status: 503, headers });
  if (!validPermisOrigin(request)) return NextResponse.json({ error: "Origine refusée." }, { status: 403, headers });
  try {
    const raw = await request.text();
    if (raw.length > 2048) return NextResponse.json({ error: "Requête invalide." }, { status: 400, headers });
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid body");
    const ipKey = permisClientKey(request, body.action === "verify" ? "verify" : "request");
    const deps = permisAccessDependencies();
    if (body.action === "request") {
      if (Object.keys(body).some(key => !["action", "email", "telephone"].includes(key))) throw new Error("Unexpected field");
      const email = typeof body.email === "string" ? body.email.trim() : "";
      const phone = typeof body.telephone === "string" ? body.telephone.trim() : "";
      // Exactly one search field avoids authorizing a different contact through fallback.
      if (!!email === !!phone || email.length > 254 || phone.length > 40 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || (phone && !/^[+\d\s().-]{6,40}$/.test(phone))) throw new Error("Invalid contact");
      const start = Date.now();
      const result = await requestPermisAccess(email || phone, ipKey, deps);
      // Same response and minimum duration for unknown, ambiguous, throttled and valid contacts.
      await new Promise(resolve => setTimeout(resolve, Math.max(0, 6500 - (Date.now() - start))));
      return NextResponse.json(result, { headers });
    }
    if (body.action === "verify") {
      if (Object.keys(body).some(key => !["action", "challengeId", "code"].includes(key)) || typeof body.challengeId !== "string" || typeof body.code !== "string") throw new Error("Invalid verification");
      const token = await verifyPermisAccess(body.challengeId, body.code, ipKey, deps);
      if (!token) return NextResponse.json({ error: "Code invalide ou expiré." }, { status: 400, headers });
      const response = NextResponse.json({ ok: true }, { headers });
      response.cookies.set(PERMIS_COOKIE, token, permisCookieOptions());
      return response;
    }
    throw new Error("Invalid action");
  } catch {
    return NextResponse.json({ error: "Requête invalide ou service indisponible." }, { status: 400, headers });
  }
}
