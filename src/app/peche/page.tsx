import { PecheBookingForm } from "@/components/peche/PecheBookingForm";
import { PecheGallery } from "@/components/peche/PecheGallery";
import { PecheHero } from "@/components/peche/PecheHero";
import { PecheHighlights } from "@/components/peche/PecheHighlights";
import { PecheInfoCards } from "@/components/peche/PecheInfoCards";
import { PecheIntro } from "@/components/peche/PecheIntro";
import { PecheSpecies } from "@/components/peche/PecheSpecies";
import { PecheVideo } from "@/components/peche/PecheVideo";

export default function PechePage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PecheHero />

      <div className="mx-auto max-w-md space-y-8 px-4 py-8 md:max-w-5xl md:py-10">
        <PecheIntro />
        <PecheVideo />
        <PecheHighlights />
        <PecheBookingForm />
        <PecheSpecies />
        <PecheGallery />
        <PecheInfoCards />
      </div>
    </main>
  );
}
