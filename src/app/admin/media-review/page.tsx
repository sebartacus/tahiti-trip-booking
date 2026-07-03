import { readdir, readFile } from "fs/promises";
import path from "path";
import { notFound } from "next/navigation";
import { MediaReviewStudio } from "./studio";

type VideoAsset = {
  id: string;
  name: string;
  path: string;
  folder: string;
};

type ReviewData = {
  videos?: Record<string, unknown>;
};

const videoExtensions = new Set([".mp4", ".mov", ".webm", ".m4v"]);

async function walkMedia(dir: string, root: string): Promise<VideoAsset[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const videos: VideoAsset[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      videos.push(...(await walkMedia(fullPath, root)));
      continue;
    }

    if (!entry.isFile() || !videoExtensions.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }

    const relativePublicPath = path
      .relative(root, fullPath)
      .replaceAll(path.sep, "/");
    const publicPath = `/media/${relativePublicPath}`;

    videos.push({
      id: publicPath,
      name: entry.name,
      path: publicPath,
      folder: path.dirname(relativePublicPath).replaceAll(path.sep, "/"),
    });
  }

  return videos.sort((a, b) => a.path.localeCompare(b.path));
}

async function readReviewData(): Promise<ReviewData> {
  try {
    const file = await readFile(path.join(process.cwd(), "media-review.json"), "utf8");
    return JSON.parse(file) as ReviewData;
  } catch {
    return { videos: {} };
  }
}

export default async function MediaReviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const mediaRoot = path.join(process.cwd(), "public", "media");
  const [videos, reviewData] = await Promise.all([
    walkMedia(mediaRoot, mediaRoot),
    readReviewData(),
  ]);

  return (
    <MediaReviewStudio
      videos={videos}
      initialReviewData={reviewData.videos || {}}
    />
  );
}
