import { guidePlanningResponse } from "@/lib/guideBaleinesServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request) { return guidePlanningResponse(request); }
