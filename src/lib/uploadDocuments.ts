import { supabase } from "./supabase";

export async function uploadDocument(
  fichier: File | null,
  type: string
) {
  if (!fichier) return null;

  const nomNettoye = fichier.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll(" ", "-")
    .replace(/[^a-zA-Z0-9.\-_]/g, "");

  const chemin = `${Date.now()}-${type}-${nomNettoye}`;

  const { error } = await supabase.storage
    .from("documents-permis")
    .upload(chemin, fichier);

  if (error) {
    throw error;
  }

  return chemin;
}