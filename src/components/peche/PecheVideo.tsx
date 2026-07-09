"use client";

type PecheVideoItem = {
  id: string;
  title: string;
  src: string;
  poster: string;
};

const pecheVideos: PecheVideoItem[] = [
  {
    id: "haura-tetiaroa-2025-06",
    title: "Haura Tetiaroa 06/2025",
    src: "/videos/peche/Haura%20Tetiaroa%2006_2025.mp4",
    poster: "/images/peche/marlin.jpg",
  },
];

export function PecheVideo() {
  const video = pecheVideos[0];

  return (
    <section className="peche-reveal mx-auto w-full max-w-5xl px-4 py-8 md:py-10">
      <div className="mb-4">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
          Video
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">
          {video.title}
        </h2>
      </div>

      <div className="overflow-hidden rounded-3xl border border-cyan-100 bg-cyan-50 shadow-[0_20px_50px_rgba(8,145,178,0.12)]">
        <video
          className="aspect-video w-full object-cover"
          controls
          playsInline
          poster={video.poster}
          preload="metadata"
          src={video.src}
        />
      </div>
    </section>
  );
}
