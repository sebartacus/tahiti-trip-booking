import { supabase } from "./supabase";

export async function uploadDocument(
  fichier: File | null,
  type: string
) {
  if (!fichier) return null;

  const nomNettoye = fichier.name.replaceAll(" ", "-");
  const chemin = `${Date.now()}-${type}-${nomNettoye}`;

  const { error } = await supabase.storage
    .from("documents-permis")
    .upload(chemin, fichier);

  if (error) {
    throw error;
  }

  return chemin;
}