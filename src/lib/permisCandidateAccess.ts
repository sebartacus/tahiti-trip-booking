import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";

export const PERMIS_CODE_SECONDS = 600;
export const PERMIS_COOKIE_SECONDS = 1800;
export const PERMIS_MAX_ATTEMPTS = 5;
export const PERMIS_COOKIE = "permis_candidate_session";
export const PERMIS_ACCESS_MESSAGE = "Si un dossier unique avec un email correspond, un code vous sera envoyé. Sinon, contactez l’administration.";

function secret() {
  const value = process.env.PERMIS_ACCESS_SECRET?.trim();
  if (!value || value.length < 32) throw new Error("PERMIS_ACCESS_SECRET manquant ou trop court.");
  return value;
}
function mac(purpose: string, value: string) {
  return createHmac("sha256", secret()).update(purpose + ":" + value).digest("hex");
}
export function generatePermisCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
export function newPermisChallengeId() { return randomUUID(); }
export function hashPermisCode(id: string, code: string) { return mac("code", id + ":" + code); }
export function hashPermisLimit(value: string) { return mac("limit", value); }
export function normalizePermisContact(value: string) {
  return value.includes("@") ? value.trim().toLowerCase() : value.replace(/[^0-9]/g, "");
}
export function equalPermisSignature(a: string, b: string) {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function createPermisCookie(reservationId: string, now = Date.now()) {
  if (!/^\d+$/.test(reservationId)) throw new Error("Identifiant de dossier invalide.");
  const payload = Buffer.from(JSON.stringify({ v: 1, purpose: "permis-candidate", rid: reservationId, exp: Math.floor(now / 1000) + PERMIS_COOKIE_SECONDS, nonce: randomUUID() })).toString("base64url");
  return payload + "." + mac("session", payload);
}
export function verifyPermisCookie(token: unknown, now = Date.now()): string | null {
  try {
    if (typeof token !== "string" || token.length > 2048) return null;
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra || !equalPermisSignature(signature, mac("session", payload))) return null;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (value.v !== 1 || value.purpose !== "permis-candidate" || typeof value.rid !== "string" || !/^\d+$/.test(value.rid) || !Number.isInteger(value.exp) || value.exp <= Math.floor(now / 1000) || value.exp > Math.floor(now / 1000) + PERMIS_COOKIE_SECONDS) return null;
    return value.rid;
  } catch { return null; }
}
export function permisCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/api/permis/reprise", maxAge: PERMIS_COOKIE_SECONDS };
}
export function validPermisOrigin(request: Request) {
  try {
    const configured = process.env.PERMIS_REPRISE_ORIGIN;
    if (!configured) return false;
    const allowed = new URL(configured);
    if (allowed.origin !== configured || (process.env.NODE_ENV === "production" && allowed.protocol !== "https:")) return false;
    return request.headers.get("origin") === allowed.origin && request.headers.get("sec-fetch-site") !== "cross-site";
  } catch { return false; }
}
export function permisClientKey(request: Request, purpose: "request" | "verify" = "request") {
  // Only trust this header on a deployment whose reverse proxy overwrites it.
  const forwarded = process.env.PERMIS_TRUST_PROXY === "true" ? request.headers.get("x-forwarded-for")?.split(",")[0].trim() : null;
  return hashPermisLimit(purpose + ":ip:" + (forwarded || "shared"));
}
