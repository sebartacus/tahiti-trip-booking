import { NextResponse } from "next/server";
import { PERMIS_COOKIE, validPermisOrigin, verifyPermisCookie } from "./permisCandidateAccess";
import { getPermisServerClient } from "./permisServer";
import { datePermis, sansExamen } from "./permisPlanning";

export class RepriseError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function repriseJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
export function repriseFailure(error: unknown) {
  return error instanceof RepriseError ? repriseJson({ error: error.message }, error.status)
    : repriseJson({ error: "Service indisponible. Réessayez ou contactez l’administration." }, 503);
}
export function requirePermisCandidate(request: Request, mutation = false) {
  if (process.env.PERMIS_REPRISE_ACCESS_ENABLED !== "true") throw new RepriseError(503, "Service indisponible.");
  if (mutation && !validPermisOrigin(request)) throw new RepriseError(403, "Origine refusée.");
  if ([...new URL(request.url).searchParams.keys()].some(key => key !== "date")) throw new RepriseError(400, "Paramètre interdit.");
  const token = request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(PERMIS_COOKIE + "="))?.slice(PERMIS_COOKIE.length + 1);
  const id = verifyPermisCookie(token);
  if (!id) throw new RepriseError(401, "Session expirée. Demandez un nouveau code.");
  return id;
}
export const candidateFields = "id,prenom,nom,prenom2,nom2,email,telephone,formule,type_cours,origine_reservation,examen,date_cours,creneau,statut,archived,certificat_url,formulaire_url,photo_url,identite_url";
export type CandidateRow = {
  id: string | number; prenom: string | null; nom: string | null; prenom2: string | null; nom2: string | null;
  email: string | null; telephone: string | null; formule: string | null; type_cours: string | null;
  origine_reservation: string | null; examen: string | null; date_cours: string | null; creneau: string | null;
  statut: string | null; archived: boolean | null;
  certificat_url: string | null; formulaire_url: string | null; photo_url: string | null; identite_url: string | null;
};
export async function readPermisCandidate(id: string, db = getPermisServerClient()): Promise<CandidateRow> {
  const { data, error } = await db.from("reservations").select(candidateFields).eq("id", id).maybeSingle();
  if (error) throw new Error("Candidate read failed");
  if (!data || data.archived) throw new RepriseError(401, "Dossier indisponible. Contactez l’administration.");
  return data as CandidateRow;
}
export function candidateView(row: CandidateRow) {
  return {
    prenom: row.prenom, nom: row.nom, prenom2: row.prenom2, nom2: row.nom2, formule: row.formule,
    examen: sansExamen(row.examen) ? null : datePermis(row.examen) || row.examen,
    date_cours: datePermis(row.date_cours) || row.date_cours, creneau: row.creneau, statut: row.statut,
    documents: { certificat: !!row.certificat_url?.trim(), formulaire: !!row.formulaire_url?.trim(), photo: !!row.photo_url?.trim(), identite: !!row.identite_url?.trim() },
  };
}
// Bound bytes even when Content-Length is absent or untrusted.
export async function boundedBody(request: Request, max: number) {
  if (Number(request.headers.get("content-length")) > max) throw new RepriseError(413, "Fichier ou requête trop volumineux.");
  const reader = request.body?.getReader();
  if (!reader) throw new RepriseError(400, "Requête vide.");
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > max) { await reader.cancel(); throw new RepriseError(413, "Fichier ou requête trop volumineux."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
