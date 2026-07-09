"use client";

type BaleinesVideoItem = {
  id: string;
  title: string;
  src: string;
  poster: string;
};

const baleinesVideos: BaleinesVideoItem[] = [
  {
    id: "rencontres-baleines",
    title: "Quelques images de nos rencontres avec les baleines",
    src: "/videos/baleines/baleines-rencontre-web.mp4",
    poster: "/images/baleines/video-cover.jpg",
  },
];

export function BaleinesVideo() {
  const video = baleinesVideos[0];

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
