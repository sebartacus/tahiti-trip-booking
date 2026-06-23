import Link from "next/link";
export default function Home() {
  return (
    <main className="min-h-screen bg-sky-950 text-white">
      <div className="max-w-6xl mx-auto p-6">

        <h1 className="text-4xl font-bold text-center mb-3">
          Tahiti Trip Fishing
        </h1>

        <p className="text-center mb-10 text-slate-300">
          Réservez votre activité ou votre formation permis côtier
        </p>

        <div className="grid md:grid-cols-2 gap-6">

          <Link href="/permis">
  <div className="rounded-2xl bg-sky-800 p-8 shadow-lg cursor-pointer hover:bg-sky-700">
    <h2 className="text-2xl font-bold mb-2">
      ⚓ Permis Côtier
    </h2>
    <p>
      Réserver une formation permis côtier
    </p>
  </div>
</Link>

          <Link href="/baleines">
  <div className="rounded-2xl bg-cyan-700 p-8 shadow-lg cursor-pointer hover:bg-cyan-600">
            <h2 className="text-2xl font-bold mb-2">
              🐋 Whale Watching
            </h2>
            <p>
              Réserver une sortie observation des baleines
            </p>
          </div>
</Link>

          <div className="rounded-2xl bg-blue-700 p-8 shadow-lg cursor-pointer hover:bg-blue-600">
            <h2 className="text-2xl font-bold mb-2">
              🎣 Pêche au Gros
            </h2>
            <p>
              Réserver une sortie pêche
            </p>
          </div>

          <div className="rounded-2xl bg-indigo-700 p-8 shadow-lg cursor-pointer hover:bg-indigo-600">
            <h2 className="text-2xl font-bold mb-2">
              🌙 Pêche de Nuit
            </h2>
            <p>
              Réserver une sortie nocturne
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}