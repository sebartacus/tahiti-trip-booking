export default function PermisPage() {
  return (
    <main className="min-h-screen bg-sky-950 text-white p-6">
      <div className="max-w-4xl mx-auto">

        <h1 className="text-4xl font-bold mb-8">
          ⚓ Permis Côtier
        </h1>

        <div className="grid md:grid-cols-2 gap-6">

          <div className="bg-sky-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">
              Formule Classique
            </h2>

            <p className="text-4xl font-bold mb-4">
              25 000 XPF
            </p>

            <ul className="space-y-2">
              <li>✓ Application de code</li>
              <li>✓ Cours pratique</li>
              <li>✓ Présentation à l'examen</li>
              <li>✓ Constitution du dossier</li>
              <li>✗ Timbres fiscaux à fournir</li>
            </ul>

            <button className="mt-6 w-full bg-green-600 p-3 rounded-xl">
              Choisir
            </button>
          </div>

          <div className="bg-cyan-700 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">
              Formule Sérénité
            </h2>

            <p className="text-4xl font-bold mb-4">
              33 000 XPF
            </p>

            <ul className="space-y-2">
              <li>✓ Application de code</li>
              <li>✓ Cours pratique</li>
              <li>✓ Présentation à l'examen</li>
              <li>✓ Constitution du dossier</li>
              <li>✓ Gestion des timbres fiscaux</li>
            </ul>

            <button className="mt-6 w-full bg-green-600 p-3 rounded-xl">
              Choisir
            </button>
          </div>

        </div>

      </div>
    </main>
  );
}