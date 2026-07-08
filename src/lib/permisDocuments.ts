export const permisDocuments = [
  {
    key: "certificat-medical",
    title: "Certificat d'aptitude physique",
    description: "À faire remplir par le médecin.",
    href: "/documents/permis/certificat aptitude physique.pdf",
    publicPath: "documents/permis/certificat aptitude physique.pdf",
    filename: "certificat aptitude physique.pdf",
  },
  {
    key: "formulaire-inscription",
    title: "Formulaire d'inscription",
    description: "À compléter et signer.",
    href: "/documents/permis/formulaire_inscription.pdf",
    publicPath: "documents/permis/formulaire_inscription.pdf",
    filename: "formulaire_inscription.pdf",
  },
] as const;

export const permisDocumentAttachments = permisDocuments.map((document) => ({
  filename: document.filename,
  publicPath: document.publicPath,
}));

export function getPermisRequiredDocumentLabels(formule?: string | null) {
  return [
    "Pièce d'identité",
    "Photo d'identité",
    "Certificat d'aptitude physique rempli par le médecin",
    "Formulaire d'inscription complété",
    formule === "Classique"
      ? "Timbres fiscaux à déposer auprès de Tahiti Trip Fishing"
      : "Timbres fiscaux pris en charge par Tahiti Trip Fishing",
  ];
}
