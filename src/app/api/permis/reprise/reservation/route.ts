import { candidateView, readPermisCandidate, requirePermisCandidate, repriseFailure, repriseJson } from "@/lib/permisRepriseServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { return repriseJson({ reservation: candidateView(await readPermisCandidate(requirePermisCandidate(request))) }); }
  catch (error) { return repriseFailure(error); }
}
