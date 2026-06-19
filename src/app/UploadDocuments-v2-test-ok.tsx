"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

function UploadField({
  title,
  accept,
  file,
  onChange,
}: {
  title: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="font-semibold text-sky-900 mb-3">{title}</p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-xl bg-sky-700 px-4 py-3 text-white hover:bg-sky-600"
      >
        📄 Sélectionner le fichier
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="hidden"
      />

      {file ? (
  <div className="mt-3 flex items-center justify-between">
    <p className="text-green-700 font-medium">
      ✅ {file.name}
    </p>

    <button
      type="button"
      onClick={() => onChange(null)}
      className="rounded-lg bg-red-100 px-3 py-1 text-red-700 hover:bg-red-200"
    >
      ❌ Supprimer
    </button>
  </div>
) : (
  <p className="mt-3 text-slate-500 text-sm">
    Aucun fichier ajouté
  </p>
)}
    </div>
  );
}

export default function UploadDocuments() {
  const [certificat, setCertificat] = useState<File | null>(null);
  const [formulaire, setFormulaire] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [identite, setIdentite] = useState<File | null>(null);
const [uploadEnCours, setUploadEnCours] = useState(false);

async function testerUpload() {
  if (!certificat) {
    alert("Sélectionnez un certificat PDF.");
    return;
  }

  setUploadEnCours(true);

  const nomFichier = `${Date.now()}-${certificat.name}`;

  const { error } = await supabase.storage
    .from("documents-permis")
    .upload(nomFichier, certificat);

  setUploadEnCours(false);

  if (error) {
    console.error(error);
    alert("Erreur upload");
    return;
  }

  alert("Upload réussi !");
}  
return (
    <div className="mt-6 bg-slate-50 rounded-xl p-4">
      <h4 className="text-xl font-bold mb-3 text-sky-950">
        Téléverser vos documents
      </h4>

      <div className="space-y-4">
        <UploadField
          title="Certificat d'aptitude physique (PDF)"
          accept="application/pdf"
          file={certificat}
          onChange={setCertificat}
        />

        <UploadField
          title="Formulaire d'inscription complété (PDF)"
          accept="application/pdf"
          file={formulaire}
          onChange={setFormulaire}
        />

        <UploadField
          title="Photo d'identité récente (JPEG)"
          accept="image/jpeg"
          file={photo}
          onChange={setPhoto}
        />

        <UploadField
          title="Photocopie de la pièce d'identité (PDF)"
          accept="application/pdf"
          file={identite}
          onChange={setIdentite}
        />
      </div>
<div className="mt-6">
  <button
    type="button"
    onClick={testerUpload}
    disabled={uploadEnCours}
    className="rounded-xl bg-green-600 px-6 py-3 text-white hover:bg-green-500"
  >
    {uploadEnCours
      ? "Envoi en cours..."
      : "Tester l'envoi vers Supabase"}
  </button>
</div>    
</div>
  );
}