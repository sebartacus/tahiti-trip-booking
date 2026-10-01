import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GUIDE_COOKIE, verifyGuideToken } from "@/lib/guideBaleinesSession";
import { getTahitiToday } from "@/lib/tahiti-date";
import GuidePlanning from "./GuidePlanning";

export const dynamic = "force-dynamic";
export default async function GuidePage() {
  if (!verifyGuideToken((await cookies()).get(GUIDE_COOKIE)?.value)) redirect("/planning-guide-baleines/connexion");
  return <GuidePlanning today={getTahitiToday()} />;
}
