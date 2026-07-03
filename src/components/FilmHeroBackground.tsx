import { existsSync } from "fs";
import path from "path";

type FilmKey = "official" | "peche" | "baleines" | "permis" | "tetiaroa";

type FilmHeroBackgroundProps = {
  film?: string;
};

const films: Record<FilmKey, string> = {
  official: "tahiti-trip-official.mp4",
  peche: "peche.mp4",
  baleines: "baleines.mp4",
  permis: "permis.mp4",
  tetiaroa: "tetiaroa.mp4",
};

function normalizeFilm(value: string | undefined): FilmKey {
  if (
    value === "peche" ||
    value === "baleines" ||
    value === "permis" ||
    value === "tetiaroa" ||
    value === "official"
  ) {
    return value;
  }

  return "official";
}

function mediaExists(relativePath: string) {
  return existsSync(path.join(process.cwd(), "public", relativePath));
}

export function FilmHeroBackground({ film }: FilmHeroBackgroundProps) {
  const filmKey = normalizeFilm(film);
  const videoPath = `/media/films/${films[filmKey]}`;
  const videoRelativePath = `media/films/${films[filmKey]}`;
  const coverPath = "/media/films/cover.jpg";
  const coverRelativePath = "media/films/cover.jpg";
  const hasVideo = mediaExists(videoRelativePath);
  const coverImage = mediaExists(coverRelativePath)
    ? coverPath
    : "/images/peche/hero.jpg";

  if (hasVideo) {
    return (
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        poster={coverImage}
        src={videoPath}
      />
    );
  }

  return (
    <div
      className="absolute inset-0 bg-cover bg-center"
      role="img"
      aria-label="Tahiti Trip Fishing"
      style={{ backgroundImage: `url('${coverImage}')` }}
    />
  );
}
