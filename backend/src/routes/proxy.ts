import { Hono } from "hono";
import { resolveThumbnailSource } from "./thumbnailSource";

// YouTube Data API が返すサムネイルのキーを、解像度の高い順に並べたもの。
// 動画によって用意される解像度が異なるため、上から順に使えるものを選ぶ。
const THUMBNAIL_PREFERENCE = ["maxres", "standard", "high", "medium", "default"] as const;

type Thumbnail = { url: string };
type VideosResponse = {
  items?: { snippet?: { thumbnails?: Record<string, Thumbnail | undefined> } }[];
};
type OembedResponse = { thumbnail_url?: string };

function pickThumbnailUrl(body: VideosResponse): string | null {
  const thumbnails = body.items?.[0]?.snippet?.thumbnails;
  if (!thumbnails) return null;

  for (const key of THUMBNAIL_PREFERENCE) {
    const thumbnail = thumbnails[key];
    if (thumbnail) return thumbnail.url;
  }
  return null;
}

export const proxyRoute = new Hono();

// サムネイルは画像URLの直リンクではなく、各サービスがドキュメント化している
// 経路（YouTube は Data API、Spotify と SoundCloud は oEmbed）で解決する。
// 画像URLの推測やスクレイピングは各社の規約で禁じられているため。
proxyRoute.get("/thumbnail", async (c) => {
  const songLink = c.req.query("url");
  const source = songLink ? resolveThumbnailSource(songLink) : null;
  if (!source) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Unsupported url" } }, 400);
  }

  let thumbnailUrl: string | null;
  if (source.kind === "youtube") {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return c.json(
        { error: { code: "CONFIGURATION_ERROR", message: "YOUTUBE_API_KEY is not configured" } },
        500
      );
    }

    let metadata: Response;
    try {
      metadata = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${source.videoId}&key=${apiKey}`
      );
    } catch {
      return c.json({ error: { code: "UPSTREAM_ERROR", message: "Failed to reach YouTube" } }, 502);
    }

    if (!metadata.ok) {
      return c.json(
        { error: { code: "UPSTREAM_ERROR", message: "YouTube returned an error" } },
        502
      );
    }

    thumbnailUrl = pickThumbnailUrl((await metadata.json()) as VideosResponse);
  } else {
    let metadata: Response;
    try {
      metadata = await fetch(source.endpoint);
    } catch {
      return c.json(
        { error: { code: "UPSTREAM_ERROR", message: "Failed to reach the provider" } },
        502
      );
    }

    if (!metadata.ok) {
      return c.json(
        { error: { code: "UPSTREAM_ERROR", message: "The provider returned an error" } },
        502
      );
    }

    thumbnailUrl = ((await metadata.json()) as OembedResponse).thumbnail_url ?? null;
  }

  if (!thumbnailUrl) {
    return c.json({ error: { code: "NOT_FOUND", message: "Thumbnail not available" } }, 404);
  }

  let upstream: Response;
  try {
    upstream = await fetch(thumbnailUrl);
  } catch {
    return c.json({ error: { code: "UPSTREAM_ERROR", message: "Failed to fetch thumbnail" } }, 502);
  }

  if (!upstream.ok) {
    return c.json(
      { error: { code: "UPSTREAM_ERROR", message: "Upstream returned an error" } },
      502
    );
  }

  const body = await upstream.arrayBuffer();
  return c.body(body, 200, {
    "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
    "Cache-Control": "public, max-age=86400",
  });
});
