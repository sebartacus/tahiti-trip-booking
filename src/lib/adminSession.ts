import {
  createHmac,
  timingSafeEqual,
} from "crypto";

export const ADMIN_SESSION_COOKIE = "tahiti_trip_admin_session";
export const ADMIN_SESSION_DURATION_SECONDS = 8 * 60 * 60;

type AdminSessionPayload = {
  exp: number;
  version: 1;
};

function getSessionSecret() {
  const configuredSecret = process.env.ADMIN_SESSION_SECRET?.trim();

  if (configuredSecret) return configuredSecret;

  if (process.env.NODE_ENV !== "production") {
    return "tahiti-trip-admin-development-session-secret";
  }

  throw new Error("ADMIN_SESSION_SECRET doit être configuré en production.");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function getCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") || "";

  for (const cookie of cookieHeader.split(";")) {
    const [cookieName, ...valueParts] = cookie.trim().split("=");

    if (cookieName === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return "";
}

export function createAdminSessionToken(now = Date.now()) {
  const payload: AdminSessionPayload = {
    exp: Math.floor(now / 1000) + ADMIN_SESSION_DURATION_SECONDS,
    version: 1,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyAdminSession(request: Request, now = Date.now()) {
  try {
    const token = getCookie(request, ADMIN_SESSION_COOKIE);
    const [encodedPayload, receivedSignature, extraPart] = token.split(".");

    if (!encodedPayload || !receivedSignature || extraPart) return false;
    if (!safeEqual(receivedSignature, sign(encodedPayload))) return false;

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as Partial<AdminSessionPayload>;

    return (
      payload.version === 1 &&
      typeof payload.exp === "number" &&
      payload.exp > Math.floor(now / 1000)
    );
  } catch {
    return false;
  }
}

export function verifyAdminPassword(password: unknown) {
  const configuredPassword =
    process.env.NEXT_PUBLIC_ADMIN_PASSWORD?.trim() || "admin123";

  return (
    typeof password === "string" &&
    safeEqual(password.trim(), configuredPassword)
  );
}

export function adminSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: ADMIN_SESSION_DURATION_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
