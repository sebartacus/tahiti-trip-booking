import { datePermis, type PermisDossier } from "./permisPlanning";

export function permisReexamenProblem(row: PermisDossier, today: string): string | null {
  if (row.archived) return "Ce dossier est archivé.";
  if (row.prenom2?.trim() || row.nom2?.trim()) return "Dossier à deux participants : une date d’examen commune. Réinscription individuelle impossible avec le modèle actuel ; aucun participant ne sera déplacé.";
  if (row.statut === "Permis obtenu") return "Ce candidat a déjà obtenu son permis.";
  const previous = datePermis(row.examen);
  if (!previous) return "Ce dossier ne possède pas de date d’examen précédente reconnue.";
  if (previous >= today) return "L’examen précédent doit être passé pour enregistrer un échec.";
  return null;
}
