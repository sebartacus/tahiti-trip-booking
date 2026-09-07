import { getPermisServerClient } from "@/lib/permisServer";
import { boundedBody, readPermisCandidate, requirePermisCandidate, RepriseError, repriseFailure, repriseJson } from "@/lib/permisRepriseServer";
import { PERMIS_DOCUMENT_BYTES, permisDocumentPath, validatePermisDocument, type PermisDocumentKind } from "@/lib/permisRepriseDocuments";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const id = requirePermisCandidate(request, true);
    const bytes = await boundedBody(request, PERMIS_DOCUMENT_BYTES + 16384);
    let form: FormData;
    try { form = await new Response(new Uint8Array(bytes), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData(); }
    catch { throw new RepriseError(400, "Envoi de fichier invalide."); }
    if ([...form.keys()].length !== 2 || !form.has("kind") || !form.has("file")) throw new RepriseError(400, "Champ interdit.");
    const kind = form.get("kind"), file = form.get("file");
    if (typeof kind !== "string" || !(file instanceof File)) throw new RepriseError(400, "Document invalide.");
    const accepted = await validatePermisDocument(kind, file);
    const db = getPermisServerClient();
    await readPermisCandidate(id, db);
    const path = permisDocumentPath(id, kind as PermisDocumentKind, accepted.extension);
    const uploaded = await db.storage.from("documents-permis").upload(path, accepted.bytes, { contentType: accepted.mime, upsert: false });
    if (uploaded.error) throw new Error("Upload failed");
    const linked = await db.from("reservations").update({ [accepted.column]: path }).eq("id", id).or("archived.is.null,archived.eq.false").select("id").maybeSingle();
    if (linked.error || !linked.data) {
      // Only remove the newly generated object, never an existing document/invoice.
      await db.storage.from("documents-permis").remove([path]).catch(() => undefined);
      throw new Error("Document link failed");
    }
    return repriseJson({ ok: true, kind });
  } catch (error) { return repriseFailure(error); }
}
