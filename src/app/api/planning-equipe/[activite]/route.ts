import { NextResponse } from "next/server";
import { EMPLOYEE_ACTIVITIES, type EmployeeActivity } from "@/lib/employeePlanning";
import { employeeActivityResponse } from "@/lib/employeePlanningServer";
import { employeeResponseHeaders } from "@/lib/employeePlanningSession";

export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ activite: string }> }) {
  const { activite } = await context.params;
  if (!EMPLOYEE_ACTIVITIES.includes(activite as EmployeeActivity)) {
    return NextResponse.json({ error: "Activité inconnue." }, { status: 404, headers: employeeResponseHeaders });
  }
  return employeeActivityResponse(request, activite as EmployeeActivity);
}
