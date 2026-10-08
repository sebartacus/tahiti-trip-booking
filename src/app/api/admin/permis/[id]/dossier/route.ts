import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { getPermisServerClient } from "@/lib/permisServer";
import { buildDossierZip, dossierDocuments, dossierZipName } from "@/lib/permisDossierZip";
import type { PermisDossier } from "@/lib/permisPlanning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const failure = (error: string, status: number) => NextResponse.json({ error }, { status, headers });
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(request)) return failure("Accès admin refusé.", 401);
  const { id } = await context.params;
  if (!/^[1-9]\d*$/.test(id)) return failure("Identifiant de dossier invalide.", 400);
  try {
    const db = getPermisServerClient();
    const result = await db.from("reservations").select("id,prenom,nom,certificat_url,formulaire_url,photo_url,identite_url").eq("id", id).maybeSingle();
    if (result.error) throw result.error;
    const row = result.data as PermisDossier | null;
    if (!row) return failure("Dossier Permis introuvable.", 404);
    const files: { name: string; bytes: Buffer }[] = [];
    for (const [field, label] of dossierDocuments) {
      const path = row[field]?.trim();
      if (!path) continue;
      if (path.startsWith("/") || path.includes("\\") || path.includes(":") || path.split("/").some(p => p === ".." || p === ".")) return failure(`Chemin invalide pour ${label}.`, 409);
      const downloaded = await db.storage.from("documents-permis").download(path);
      if (downloaded.error || !downloaded.data) {
        const status = String(downloaded.error && "statusCode" in downloaded.error ? downloaded.error.statusCode : "");
        if (status === "404" || (status === "400" && /not found|does not exist|absent/i.test(downloaded.error?.message || ""))) return failure(`Pièce absente du Storage : ${label}. Aucun ZIP téléchargé.`, 404);
        return failure(`Impossible de récupérer la pièce : ${label}. Veuillez réessayer.`, 502);
      }
      const extension = path.match(/\.(pdf|jpe?g)$/i)?.[1].toLowerCase() || (downloaded.data.type === "application/pdf" ? "pdf" : downloaded.data.type === "image/jpeg" ? "jpg" : null);
      if (!extension) return failure(`Format non reconnu pour ${label}.`, 409);
      files.push({ name: `${label}.${extension}`, bytes: Buffer.from(await downloaded.data.arrayBuffer()) });
    }
    if (!files.length) return failure("Aucune pièce déposée dans ce dossier.", 404);
    return new Response(new Uint8Array(buildDossierZip(files)), { headers: { ...headers, "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${dossierZipName(row)}"` } });
  } catch {
    return failure("Impossible de générer le dossier ZIP. Veuillez réessayer.", 500);
  }
}
