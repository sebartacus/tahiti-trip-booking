import { AdminBoatCalendar } from "./components/AdminBoatCalendar";

export default function AdminBateauPage() {
  if (process.env.NODE_ENV !== "development") {
    return (
      <main className="min-h-screen bg-cyan-50 px-4 py-10 text-slate-950">
        <section className="mx-auto max-w-md rounded-[28px] border border-cyan-100 bg-white p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-cyan-700">
            Admin bateau
          </p>
          <h1 className="mt-3 text-3xl font-black">Acces local uniquement</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
            Cette interface est reservee au developpement local pour le moment.
          </p>
        </section>
      </main>
    );
  }

  return <AdminBoatCalendar />;
}
