import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { EMPLOYEE_COOKIE, createEmployeeToken, employeeConfigured, employeeCookieOptions, employeePasswordMatches, employeeResponseHeaders, verifyEmployeeRequest } from "@/lib/employeePlanningSession";

export const dynamic = "force-dynamic";
const attempts = new Map<string, { count: number; until: number }>();
const json = (value: object, status = 200) => NextResponse.json(value, { status, headers: employeeResponseHeaders });
function sameOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host") || url.host;
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || url.protocol.slice(0, -1);
  return (protocol === "https" || protocol === "http") && request.headers.get("origin") === protocol + "://" + host;
}
export async function GET(request: Request) {
  if (!employeeConfigured()) return json({ error: "Accès équipe indisponible." }, 503);
  return verifyEmployeeRequest(request) ? json({ authenticated: true }) : json({ authenticated: false }, 401);
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Origine refusée." }, 403);
  if (!employeeConfigured()) return json({ error: "Accès équipe indisponible." }, 503);
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = createHash("sha256").update(address).digest("hex");
  const attempt = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
  if (attempt.count >= 10 || (!attempts.has(key) && attempts.size >= 1000)) {
    const response = json({ error: "Trop de tentatives. Réessayez dans 15 minutes." }, 429);
    response.headers.set("Retry-After", "900");
    return response;
  }
  attempt.count++; attempts.set(key, attempt);
  let password: unknown;
  try {
    if (Number(request.headers.get("content-length") || 0) > 4096) return json({ error: "Requête invalide." }, 400);
    const body = await request.text();
    if (body.length > 4096) return json({ error: "Requête invalide." }, 400);
    password = JSON.parse(body)?.password;
  } catch { return json({ error: "Requête invalide." }, 400); }
  if (!employeePasswordMatches(password)) return json({ error: "Mot de passe incorrect." }, 401);
  attempts.delete(key);
  const response = json({ authenticated: true });
  response.cookies.set(EMPLOYEE_COOKIE, createEmployeeToken(), employeeCookieOptions());
  return response;
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Origine refusée." }, 403);
  const response = json({ authenticated: false });
  response.cookies.set(EMPLOYEE_COOKIE, "", { ...employeeCookieOptions(), maxAge: 0 });
  return response;
}
