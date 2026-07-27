import { NextResponse } from "next/server";
import {
  getAdminSupabaseClient,
} from "@/lib/adminCarnetsBaleines";
import { verifyAdminSession } from "@/lib/adminSession";

export async function GET(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "Accès admin refusé." }, { status: 401 });
  }

  const supabase = getAdminSupabaseClient();
  const carnetId = new URL(request.url).searchParams.get("id") || "";

  if (!carnetId) {
    return NextResponse.json(
      { error: "Identifiant carnet manquant." },
      { status: 400 }
    );
  }

  const carnetResponse = await supabase
    .from("carnets_baleines")
    .select("facture_url")
    .eq("id", carnetId)
    .maybeSingle();

  if (carnetResponse.error || !carnetResponse.data?.facture_url) {
    return NextResponse.json(
      { error: "Aucune facture disponible." },
      { status: 404 }
    );
  }

  const signedUrl = await supabase.storage
    .from("documents-permis")
    .createSignedUrl(String(carnetResponse.data.facture_url), 60);

  if (signedUrl.error || !signedUrl.data?.signedUrl) {
    return NextResponse.json(
      { error: "Impossible de préparer le téléchargement." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: signedUrl.data.signedUrl });
}
