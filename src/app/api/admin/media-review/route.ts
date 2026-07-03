import { readFile, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const reviewFile = path.join(process.cwd(), "media-review.json");

function unavailableOutsideDevelopment() {
  return process.env.NODE_ENV !== "development";
}

export async function GET() {
  if (unavailableOutsideDevelopment()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const content = await readFile(reviewFile, "utf8");
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json({ videos: {} });
  }
}

export async function POST(request: Request) {
  if (unavailableOutsideDevelopment()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const data = {
    updatedAt: new Date().toISOString(),
    videos:
      typeof body === "object" &&
      body !== null &&
      "videos" in body &&
      typeof body.videos === "object" &&
      body.videos !== null
        ? body.videos
        : {},
  };

  await writeFile(reviewFile, `${JSON.stringify(data, null, 2)}\n`, "utf8");

  return NextResponse.json({ ok: true });
}
