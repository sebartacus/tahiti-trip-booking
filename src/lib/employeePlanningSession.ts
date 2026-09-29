import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const EMPLOYEE_COOKIE = "tahiti_trip_employee_planning";
export const EMPLOYEE_SESSION_SECONDS = 8 * 60 * 60;

function configuration() {
  const password = process.env.EMPLOYEE_PLANNING_PASSWORD;
  const secret = process.env.EMPLOYEE_PLANNING_SESSION_SECRET;
  if (!password || !secret || secret.length < 32) throw new Error("Configuration salarié absente.");
  return { password, secret };
}
export function employeeConfigured() {
  try { configuration(); return true; } catch { return false; }
}
function digest(value: string) { return createHash("sha256").update(value).digest(); }
export function employeePasswordMatches(value: unknown) {
  return typeof value === "string" && value.length <= 1024 &&
    timingSafeEqual(digest(value), digest(configuration().password));
}
function signature(value: string) {
  const { password, secret } = configuration();
  return createHmac("sha256", secret).update("employee-planning:" + digest(password).toString("hex") + ":" + value).digest("base64url");
}
export function createEmployeeToken(now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ scope: "employee-planning", exp: Math.floor(now / 1000) + EMPLOYEE_SESSION_SECONDS })).toString("base64url");
  return body + "." + signature(body);
}
export function verifyEmployeeToken(token: string | undefined, now = Date.now()) {
  try {
    if (!token || token.length > 2048) return false;
    const [body, signed, extra] = token.split(".");
    if (!body || !signed || extra !== undefined) return false;
    if (!timingSafeEqual(digest(signed), digest(signature(body)))) return false;
    const value = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return value.scope === "employee-planning" && Number.isSafeInteger(value.exp) &&
      value.exp > Math.floor(now / 1000) && value.exp <= Math.floor(now / 1000) + EMPLOYEE_SESSION_SECONDS;
  } catch { return false; }
}
export function verifyEmployeeRequest(request: Request) {
  const cookie = (request.headers.get("cookie") || "").split(";").map(part => part.trim()).find(part => part.startsWith(EMPLOYEE_COOKIE + "="));
  return verifyEmployeeToken(cookie?.slice(EMPLOYEE_COOKIE.length + 1));
}
export function employeeCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: EMPLOYEE_SESSION_SECONDS };
}
export const employeeResponseHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie" };
