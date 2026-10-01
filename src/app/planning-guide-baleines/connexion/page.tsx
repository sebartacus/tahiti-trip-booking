import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GUIDE_COOKIE, verifyGuideToken } from "@/lib/guideBaleinesSession";
import GuideLogin from "./GuideLogin";

export const dynamic = "force-dynamic";
export default async function GuideLoginPage() {
  if (verifyGuideToken((await cookies()).get(GUIDE_COOKIE)?.value)) redirect("/planning-guide-baleines");
  return <GuideLogin />;
}
