import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const GUIDE_COOKIE = "tahiti_trip_guide_baleines";
export const GUIDE_SESSION_SECONDS = 8 * 60 * 60;
const SCOPE = "guide-baleines";

function configuration() {
  const password = process.env.GUIDE_BALEINES_PASSWORD;
  const secret = process.env.GUIDE_BALEINES_SESSION_SECRET;
  if (!password || !secret || secret.length < 32) throw new Error("Configuration Guide absente.");
  return { password, secret };
}
export function guideConfigured() {
  try { configuration(); return true; } catch { return false; }
}
function digest(value: string) { return createHash("sha256").update(value).digest(); }
export function guidePasswordMatches(value: unknown) {
  return typeof value === "string" && value.length <= 1024 &&
    timingSafeEqual(digest(value), digest(configuration().password));
}
function signature(body: string) {
  const { password, secret } = configuration();
  return createHmac("sha256", secret)
    .update(SCOPE + ":" + digest(password).toString("hex") + ":" + body).digest("base64url");
}
export function createGuideToken(now = Date.now()) {
  const body = Buffer.from(JSON.stringify({
    scope: SCOPE, exp: Math.floor(now / 1000) + GUIDE_SESSION_SECONDS,
  })).toString("base64url");
  return body + "." + signature(body);
}
export function verifyGuideToken(token: string | undefined, now = Date.now()) {
  try {
    if (!token || token.length > 2048) return false;
    const [body, signed, extra] = token.split(".");
    if (!body || !signed || extra !== undefined) return false;
    if (!timingSafeEqual(digest(signed), digest(signature(body)))) return false;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const seconds = Math.floor(now / 1000);
    return payload.scope === SCOPE && Number.isSafeInteger(payload.exp) &&
      payload.exp > seconds && payload.exp <= seconds + GUIDE_SESSION_SECONDS;
  } catch { return false; }
}
export function verifyGuideRequest(request: Request) {
  const cookie = (request.headers.get("cookie") || "").split(";")
    .map(part => part.trim()).find(part => part.startsWith(GUIDE_COOKIE + "="));
  return verifyGuideToken(cookie?.slice(GUIDE_COOKIE.length + 1));
}
export function guideCookieOptions() {
  return {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const, path: "/", maxAge: GUIDE_SESSION_SECONDS,
  };
}
export const guideResponseHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie" };
