export default function PaiementRetourPage() {
  return (
    <main className="min-h-screen bg-sky-950 text-white p-6">
      <div className="max-w-3xl mx-auto bg-white text-black rounded-2xl p-8">
        <h1 className="text-3xl font-bold mb-4">
          Retour de paiement
        </h1>

        <p className="mb-4">
          Votre paiement est en cours de vérification.
        </p>

        <p>
          Si le paiement a été accepté, votre réservation sera confirmée.
        </p>

        <a
          href="/reprendre-reservation"
          className="inline-block mt-6 bg-yellow-500 text-black font-bold px-5 py-3 rounded-xl"
        >
          Reprendre ma réservation
        </a>
      </div>
    </main>
  );
}