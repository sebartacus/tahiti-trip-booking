"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function CarnetBaleinesSuccessPage() {
  const searchParams = useSearchParams();

  const code = searchParams.get("code") || "";
  const credits = searchParams.get("credits") || "";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl bg-white p-7 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
            ✓
          </div>

          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-sky-700">
            Tahiti Trip Fishing
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            Merci pour votre achat
          </h1>

          <p className="mt-5 leading-7 text-slate-600">
            Votre paiement a été transmis à PayZen.
          </p>

          <p className="mt-2 leading-7 text-slate-600">
            Votre carnet sera activé automatiquement après confirmation du
            paiement.
          </p>

          {code && (
            <div className="mt-8 rounded-2xl bg-emerald-50 p-6 text-left">
              <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">
                Votre carnet baleines
              </p>

              <p className="mt-4 text-slate-700">
                Code du carnet :
              </p>

              <p className="mt-1 break-all text-2xl font-black tracking-wide text-slate-950">
                {code}
              </p>

              {credits && (
                <p className="mt-4 text-slate-700">
                  Crédits disponibles :{" "}
                  <strong>{credits}</strong>
                </p>
              )}

              <p className="mt-2 text-slate-700">
                Valable jusqu’au{" "}
                <strong>20 novembre 2026</strong>.
              </p>
            </div>
          )}

          <div className="mt-8 rounded-2xl bg-sky-50 p-5 text-left">
            <p className="font-bold text-sky-900">
              Conservez bien votre code carnet
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-700">
              Il vous permettra d’utiliser vos crédits pour réserver vos
              sorties baleines, à l’unité ou pour plusieurs personnes.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/baleines"
              className="rounded-full bg-sky-700 px-7 py-3 font-bold text-white"
            >
              Réserver une sortie baleines
            </Link>

            <Link
              href="/"
              className="rounded-full border border-slate-300 px-7 py-3 font-bold"
            >
              Retour à l’accueil
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}