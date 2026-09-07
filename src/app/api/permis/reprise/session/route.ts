import { PERMIS_COOKIE, permisCookieOptions, validPermisOrigin } from "@/lib/permisCandidateAccess";
import { repriseJson } from "@/lib/permisRepriseServer";
export async function DELETE(request: Request) {
  if (process.env.PERMIS_REPRISE_ACCESS_ENABLED !== "true") return repriseJson({ error: "Service indisponible." }, 503);
  if (!validPermisOrigin(request)) return repriseJson({ error: "Origine refusée." }, 403);
  const response = repriseJson({ ok: true });
  response.cookies.set(PERMIS_COOKIE, "", { ...permisCookieOptions(), maxAge: 0 });
  return response;
}
