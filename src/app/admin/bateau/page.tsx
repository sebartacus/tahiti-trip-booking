"use client";

import { useState } from "react";
import { AdminBoatCalendar } from "./components/AdminBoatCalendar";

export default function AdminBateauPage() {
  const [motDePasse, setMotDePasse] = useState("");
  const [accesAutorise, setAccesAutorise] = useState(false);

  if (!accesAutorise) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cyan-50 p-4 text-slate-950">
        <section className="w-full max-w-md rounded-[28px] border border-cyan-100 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-cyan-700">
            Admin bateau
          </p>
          <h1 className="mt-3 text-3xl font-black">Acces admin</h1>

          <input
            type="password"
            value={motDePasse}
            onChange={(event) => setMotDePasse(event.target.value)}
            placeholder="Mot de passe"
            className="mt-6 w-full rounded-xl border p-3"
          />

          <button
            type="button"
            onClick={() => {
              if (
                motDePasse ===
                (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123")
              ) {
                setAccesAutorise(true);
              } else {
                alert("Mot de passe incorrect.");
              }
            }}
            className="mt-4 w-full cursor-pointer rounded-xl bg-cyan-900 p-3 font-bold text-white"
          >
            Entrer
          </button>
        </section>
      </main>
    );
  }

  return <AdminBoatCalendar />;
}
