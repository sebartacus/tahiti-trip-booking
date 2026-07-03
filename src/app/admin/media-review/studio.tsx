"use client";

import { useMemo, useRef, useState } from "react";

type VideoAsset = {
  id: string;
  name: string;
  path: string;
  folder: string;
};

type ClipCategory =
  | "Hero"
  | "Publicité"
  | "Site"
  | "Instagram"
  | "Facebook"
  | "Transition"
  | "Drone"
  | "Émotion"
  | "Action"
  | "Clients";

type Clip = {
  id: string;
  start: number | null;
  end: number | null;
  rating: number;
  category: ClipCategory;
  comment: string;
};

type ReviewByVideo = Record<string, Clip[]>;

type MediaReviewStudioProps = {
  videos: VideoAsset[];
  initialReviewData: Record<string, unknown>;
};

const categories: ClipCategory[] = [
  "Hero",
  "Publicité",
  "Site",
  "Instagram",
  "Facebook",
  "Transition",
  "Drone",
  "Émotion",
  "Action",
  "Clients",
];

function normalizeReviewData(data: Record<string, unknown>): ReviewByVideo {
  const normalized: ReviewByVideo = {};

  for (const [videoId, clips] of Object.entries(data)) {
    if (!Array.isArray(clips)) continue;

    normalized[videoId] = clips
      .filter((clip): clip is Clip => {
        return (
          typeof clip === "object" &&
          clip !== null &&
          "id" in clip &&
          "category" in clip
        );
      })
      .map((clip) => ({
        id: typeof clip.id === "string" ? clip.id : crypto.randomUUID(),
        start: typeof clip.start === "number" ? clip.start : null,
        end: typeof clip.end === "number" ? clip.end : null,
        rating: typeof clip.rating === "number" ? clip.rating : 0,
        category: categories.includes(clip.category as ClipCategory)
          ? (clip.category as ClipCategory)
          : "Site",
        comment: typeof clip.comment === "string" ? clip.comment : "",
      }));
  }

  return normalized;
}

function formatTimecode(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) return "--:--.--";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const centiseconds = Math.floor((seconds % 1) * 100);

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

function ratingLabel(rating: number) {
  return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
}

function encodeVideoPath(pathValue: string) {
  return pathValue
    .split("/")
    .map((part, index) => (index === 0 ? part : encodeURIComponent(part)))
    .join("/");
}

export function MediaReviewStudio({
  videos,
  initialReviewData,
}: MediaReviewStudioProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedVideoId, setSelectedVideoId] = useState(videos[0]?.id || "");
  const [reviewData, setReviewData] = useState<ReviewByVideo>(() =>
    normalizeReviewData(initialReviewData)
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [draft, setDraft] = useState<Clip>({
    id: "",
    start: null,
    end: null,
    rating: 0,
    category: "Site",
    comment: "",
  });
  const [saveStatus, setSaveStatus] = useState("");

  const selectedVideo = useMemo(
    () => videos.find((video) => video.id === selectedVideoId) || videos[0],
    [selectedVideoId, videos]
  );
  const selectedClips = reviewData[selectedVideo?.id || ""] || [];

  function seekByFrame(direction: -1 | 1) {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.currentTime = Math.max(0, video.currentTime + direction / 30);
    setCurrentTime(video.currentTime);
  }

  function setDraftTime(field: "start" | "end") {
    setDraft((current) => ({
      ...current,
      [field]: videoRef.current?.currentTime ?? currentTime,
    }));
  }

  function addClip() {
    if (!selectedVideo) return;

    const clip: Clip = {
      ...draft,
      id: crypto.randomUUID(),
    };

    setReviewData((current) => ({
      ...current,
      [selectedVideo.id]: [...(current[selectedVideo.id] || []), clip],
    }));
    setDraft({
      id: "",
      start: null,
      end: null,
      rating: 0,
      category: "Site",
      comment: "",
    });
    setSaveStatus("Sélection ajoutée, non enregistrée.");
  }

  function removeClip(clipId: string) {
    if (!selectedVideo) return;

    setReviewData((current) => ({
      ...current,
      [selectedVideo.id]: (current[selectedVideo.id] || []).filter(
        (clip) => clip.id !== clipId
      ),
    }));
    setSaveStatus("Sélection supprimée, non enregistrée.");
  }

  async function saveReview() {
    setSaveStatus("Enregistrement...");

    const response = await fetch("/api/admin/media-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videos: reviewData }),
    });

    setSaveStatus(response.ok ? "Enregistré dans media-review.json." : "Erreur.");
  }

  if (!selectedVideo) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <h1 className="text-3xl font-black">Media Review Studio</h1>
        <p className="mt-3 text-slate-300">Aucune vidéo trouvée dans public/media.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-6">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
            Développement uniquement
          </p>
          <h1 className="mt-2 text-3xl font-black">Media Review Studio</h1>
          <p className="mt-2 text-sm font-bold text-slate-300">
            {videos.length} vidéos trouvées dans public/media.
          </p>

          <div className="mt-5 grid gap-2">
            {videos.map((video) => (
              <button
                key={video.id}
                type="button"
                onClick={() => {
                  setSelectedVideoId(video.id);
                  setCurrentTime(0);
                  setDraft({
                    id: "",
                    start: null,
                    end: null,
                    rating: 0,
                    category: "Site",
                    comment: "",
                  });
                }}
                className={`rounded-2xl border p-3 text-left text-sm font-bold transition ${
                  selectedVideo.id === video.id
                    ? "border-cyan-300 bg-cyan-400/20 text-white"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                <span className="block text-white">{video.name}</span>
                <span className="mt-1 block text-xs text-slate-400">
                  {video.folder}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="grid gap-5">
          <article className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">{selectedVideo.name}</h2>
                <p className="mt-1 text-sm font-bold text-slate-400">
                  {selectedVideo.folder}
                </p>
              </div>
              <div className="rounded-2xl bg-cyan-400/15 px-4 py-3 text-right">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">
                  Timecode
                </p>
                <p className="text-2xl font-black">
                  {formatTimecode(currentTime)}
                </p>
              </div>
            </div>

            <video
              key={selectedVideo.id}
              ref={videoRef}
              src={encodeVideoPath(selectedVideo.path)}
              controls
              className="mt-4 aspect-video w-full rounded-2xl bg-black object-contain"
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onLoadedMetadata={(event) => setCurrentTime(event.currentTarget.currentTime)}
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => seekByFrame(-1)}
                className="min-h-12 rounded-2xl bg-white px-4 text-sm font-black text-slate-950"
              >
                Image -1
              </button>
              <button
                type="button"
                onClick={() => seekByFrame(1)}
                className="min-h-12 rounded-2xl bg-white px-4 text-sm font-black text-slate-950"
              >
                Image +1
              </button>
              <button
                type="button"
                onClick={() => setDraftTime("start")}
                className="min-h-12 rounded-2xl bg-cyan-600 px-4 text-sm font-black text-white"
              >
                Début extrait
              </button>
              <button
                type="button"
                onClick={() => setDraftTime("end")}
                className="min-h-12 rounded-2xl bg-cyan-600 px-4 text-sm font-black text-white"
              >
                Fin extrait
              </button>
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-xl font-black">Nouvelle sélection</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InfoBox label="Début" value={formatTimecode(draft.start)} />
              <InfoBox label="Fin" value={formatTimecode(draft.end)} />
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">
                  Note
                </span>
                <select
                  value={draft.rating}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      rating: Number(event.target.value),
                    }))
                  }
                  className="min-h-12 rounded-2xl border border-white/10 bg-slate-900 px-4 font-bold text-white"
                >
                  <option value={0}>Non noté</option>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <option key={rating} value={rating}>
                      {ratingLabel(rating)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">
                  Catégorie
                </span>
                <select
                  value={draft.category}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      category: event.target.value as ClipCategory,
                    }))
                  }
                  className="min-h-12 rounded-2xl border border-white/10 bg-slate-900 px-4 font-bold text-white"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-3 grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">
                Commentaire
              </span>
              <textarea
                value={draft.comment}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    comment: event.target.value,
                  }))
                }
                className="min-h-28 rounded-2xl border border-white/10 bg-slate-900 p-4 font-bold text-white"
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={addClip}
                className="min-h-12 rounded-2xl bg-cyan-600 px-5 text-sm font-black text-white"
              >
                Ajouter la sélection
              </button>
              <button
                type="button"
                onClick={saveReview}
                className="min-h-12 rounded-2xl bg-emerald-500 px-5 text-sm font-black text-slate-950"
              >
                Enregistrer
              </button>
              {saveStatus && (
                <p className="flex min-h-12 items-center text-sm font-bold text-slate-300">
                  {saveStatus}
                </p>
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-xl font-black">Sélections</h3>
            <div className="mt-4 grid gap-3">
              {selectedClips.length === 0 && (
                <p className="text-sm font-bold text-slate-400">
                  Aucune sélection pour cette vidéo.
                </p>
              )}
              {selectedClips.map((clip) => (
                <div
                  key={clip.id}
                  className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900 p-4 md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="text-lg font-black">
                      {formatTimecode(clip.start)} → {formatTimecode(clip.end)}
                    </p>
                    <p className="mt-1 text-sm font-bold text-cyan-200">
                      {ratingLabel(clip.rating)} · {clip.category}
                    </p>
                    {clip.comment && (
                      <p className="mt-3 text-sm font-bold leading-6 text-slate-300">
                        {clip.comment}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeClip(clip.id)}
                    className="min-h-11 rounded-2xl border border-red-300/30 px-4 text-sm font-black text-red-200"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}
