import { createClient } from "@supabase/supabase-js";
import { createPermisCookie, generatePermisCode, hashPermisCode, hashPermisLimit, newPermisChallengeId, normalizePermisContact, PERMIS_ACCESS_MESSAGE } from "./permisCandidateAccess";
import { sendPermisAccessCodeEmail } from "./permisEmail";

export type AccessDependencies = {
  issue(input: { id: string; contact: string; codeHash: string; ipKey: string; contactKey: string }): Promise<string | null>;
  consume(input: { id: string; codeHash: string; ipKey: string }): Promise<string | null>;
  send(email: string, code: string): Promise<unknown>;
};
export function getPermisServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configuration serveur Permis absente.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function permisAccessDependencies(): AccessDependencies {
  const db = getPermisServerClient();
  return {
    async issue(input) {
      const result = await db.rpc("permis_issue_access_challenge", { p_id: input.id, p_contact: input.contact, p_code_hash: input.codeHash, p_ip_key: input.ipKey, p_contact_key: input.contactKey });
      if (result.error) throw new Error("Création du challenge impossible.");
      return typeof result.data === "string" ? result.data : null;
    },
    async consume(input) {
      const result = await db.rpc("permis_consume_access_challenge", { p_id: input.id, p_code_hash: input.codeHash, p_ip_key: input.ipKey });
      if (result.error) throw new Error("Vérification du challenge impossible.");
      return typeof result.data === "string" ? result.data : null;
    },
    send: sendPermisAccessCodeEmail,
  };
}
export async function requestPermisAccess(contact: string, ipKey: string, deps: AccessDependencies) {
  const id = newPermisChallengeId(), code = generatePermisCode();
  try {
    const email = await deps.issue({ id, contact: normalizePermisContact(contact), codeHash: hashPermisCode(id, code), ipKey, contactKey: hashPermisLimit("contact:" + normalizePermisContact(contact)) });
    if (email) await deps.send(email, code);
  } catch {
    // Do not log contacts, codes, provider responses or database records.
    console.error("Demande de code Permis non aboutie.");
  }
  return { message: PERMIS_ACCESS_MESSAGE, challengeId: id };
}
export async function verifyPermisAccess(id: string, code: string, ipKey: string, deps: AccessDependencies) {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^\d{6}$/.test(code)) return null;
  const reservationId = await deps.consume({ id, codeHash: hashPermisCode(id, code), ipKey });
  return reservationId ? createPermisCookie(reservationId) : null;
}
