import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EMPLOYEE_COOKIE, verifyEmployeeToken } from "@/lib/employeePlanningSession";
import EmployeeLogin from "./EmployeeLogin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Connexion équipe", robots: { index: false, follow: false } };
export default async function EmployeeLoginPage() {
  if (verifyEmployeeToken((await cookies()).get(EMPLOYEE_COOKIE)?.value)) redirect("/planning-equipe");
  return <EmployeeLogin />;
}
