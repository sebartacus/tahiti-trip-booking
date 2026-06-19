"use client";

import { useRef, useState } from "react";

type Props = {
  onFilesChange?: (files: {
    certificat: File | null;
    formulaire: File | null;
    photo: File | null;
    identite: File | null;
  }) => void;
};

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

export default function UploadDocuments({
  onFilesChange,
}: Props) {
  const [certificat, setCertificat] = useState<File | null>(null);
  const [formulaire, setFormulaire] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [identite, setIdentite] = useState<File | null>(null);

  function notifier(
    nouveauCertificat: File | null,
    nouveauFormulaire: File | null,
    nouvellePhoto: File | null,
    nouvelleIdentite: File | null
  ) {
    onFilesChange?.({
      certificat: nouveauCertificat,
      formulaire: nouveauFormulaire,
      photo: nouvellePhoto,
      identite: nouvelleIdentite,
    });
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
          onChange={(f) => {
            setCertificat(f);
            notifier(f, formulaire, photo, identite);
          }}
        />

        <UploadField
          title="Formulaire d'inscription complété (PDF)"
          accept="application/pdf"
          file={formulaire}
          onChange={(f) => {
            setFormulaire(f);
            notifier(certificat, f, photo, identite);
          }}
        />

        <UploadField
          title="Photo d'identité récente (JPEG)"
          accept="image/jpeg"
          file={photo}
          onChange={(f) => {
            setPhoto(f);
            notifier(certificat, formulaire, f, identite);
          }}
        />

        <UploadField
          title="Photocopie de la pièce d'identité (PDF)"
          accept="application/pdf"
          file={identite}
          onChange={(f) => {
            setIdentite(f);
            notifier(certificat, formulaire, photo, f);
          }}
        />
      </div>
    </div>
  );
}