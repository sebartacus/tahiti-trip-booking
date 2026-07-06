"use client";

import { useEffect, useRef, useState } from "react";

const videoSrc = "/videos/baleines/hero.mp4";
const posterSrc = "/images/baleines/hero-baleine-saut.jpg";

export function BaleinesVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoAvailable, setVideoAvailable] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let active = true;

    fetch(videoSrc, { method: "HEAD" })
      .then((response) => {
        if (active && response.ok) setVideoAvailable(true);
      })
      .catch(() => {
        if (active) setVideoAvailable(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function playVideo() {
    const video = videoRef.current;
    if (!video) return;

    video.controls = true;
    video.play();
    setPlaying(true);
  }

  return (
    <section className="peche-reveal space-y-4">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-700">
          Vidéo
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">
          Revivez l&apos;expérience
        </h2>
        <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
          Découvrez quelques instants de nos sorties d&apos;observation des
          baleines.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-cyan-100 bg-cyan-50 shadow-[0_20px_50px_rgba(8,145,178,0.12)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(8,145,178,0.16)]">
        {videoAvailable ? (
          <video
            ref={videoRef}
            className="aspect-video w-full object-cover"
            playsInline
            poster={posterSrc}
            preload="metadata"
            src={videoSrc}
          />
        ) : (
          <div
            className="aspect-video w-full bg-cover bg-center"
            role="img"
            aria-label="Aperçu vidéo baleines"
            style={{ backgroundImage: `url('${posterSrc}')` }}
          >
            <div className="flex h-full w-full items-end bg-cyan-950/10 p-5">
              <span className="rounded-full bg-white/95 px-4 py-2 text-sm font-black text-cyan-800 shadow-[0_12px_30px_rgba(8,145,178,0.18)]">
                VidÃ©o bientÃ´t disponible
              </span>
            </div>
          </div>
        )}

        {videoAvailable && !playing && (
          <button
            type="button"
            onClick={playVideo}
            className="absolute inset-0 flex items-center justify-center bg-cyan-950/20 text-white transition duration-300 hover:bg-cyan-950/14"
            aria-label="Lire la vidéo"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/95 pl-1 text-3xl text-cyan-700 shadow-[0_18px_42px_rgba(8,145,178,0.28)]">
              ▶
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
