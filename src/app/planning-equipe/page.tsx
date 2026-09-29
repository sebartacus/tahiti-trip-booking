import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EMPLOYEE_COOKIE, verifyEmployeeToken } from "@/lib/employeePlanningSession";
import { getTahitiToday } from "@/lib/tahiti-date";
import PlanningEquipe from "./PlanningEquipe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Planning équipe", robots: { index: false, follow: false } };
export default async function PlanningEquipePage() {
  if (!verifyEmployeeToken((await cookies()).get(EMPLOYEE_COOKIE)?.value)) redirect("/planning-equipe/connexion");
  return <PlanningEquipe today={getTahitiToday()} />;
}
