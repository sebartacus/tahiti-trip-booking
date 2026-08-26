import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const SALON_PUBLIC_ACCESS_DURATION_SECONDS = 15 * 60;

export type SalonPublicActivity = "baleines" | "peche" | "charter";
export type SalonPublicAccessPayload = {
  activity: SalonPublicActivity;
  rightId: string;
  saleId: string;
  exp: number;
  nonce: string;
  version: 1;
};

function secret() {
  const value =
    process.env.SALON_PUBLIC_ACCESS_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim();
  if (value) return value;
  if (process.env.NODE_ENV !== "production")
    return "tahiti-trip-salon-public-development-secret";
  throw new Error("SALON_PUBLIC_ACCESS_SECRET doit être configuré en production.");
}

function signature(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function equal(left: string, right: string) {
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function normalizeSalonReference(value: unknown) {
  return typeof value === "string"
    ? value.trim().toUpperCase().replace(/\s+/g, "")
    : "";
}

export function normalizeSalonPhone(value: unknown) {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

export function normalizeSalonEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isSalonIdentificationComplete(reference: unknown, contact: unknown) {
  const normalizedReference = normalizeSalonReference(reference);
  const rawContact = typeof contact === "string" ? contact : "";
  return Boolean(normalizedReference && (normalizeSalonEmail(rawContact).includes("@") || normalizeSalonPhone(rawContact).length >= 6));
}

export function salonContactMatches(phone: unknown, email: unknown, contact: unknown) {
  const rawContact = typeof contact === "string" ? contact : "";
  const normalizedEmail = normalizeSalonEmail(rawContact);
  return normalizedEmail.includes("@")
    ? Boolean(normalizedEmail && normalizeSalonEmail(email) === normalizedEmail)
    : Boolean(normalizeSalonPhone(rawContact) && normalizeSalonPhone(phone) === normalizeSalonPhone(rawContact));
}

export function createSalonPublicAccessToken(
  input: Pick<SalonPublicAccessPayload, "activity" | "rightId" | "saleId">,
  now = Date.now(),
) {
  const payload: SalonPublicAccessPayload = {
    ...input,
    exp: Math.floor(now / 1000) + SALON_PUBLIC_ACCESS_DURATION_SECONDS,
    nonce: randomBytes(12).toString("base64url"),
    version: 1,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifySalonPublicAccessToken(token: unknown, now = Date.now()) {
  try {
    if (typeof token !== "string") return null;
    const [encoded, received, extra] = token.split(".");
    if (!encoded || !received || extra || !equal(received, signature(encoded))) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<SalonPublicAccessPayload>;
    if (
      payload.version !== 1 ||
      !["baleines", "peche", "charter"].includes(String(payload.activity)) ||
      typeof payload.rightId !== "string" ||
      typeof payload.saleId !== "string" ||
      typeof payload.nonce !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(now / 1000)
    ) return null;
    return payload as SalonPublicAccessPayload;
  } catch {
    return null;
  }
}
