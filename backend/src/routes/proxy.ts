import { Hono } from "hono";

const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export const proxyRoute = new Hono();

proxyRoute.get("/thumbnail", async (c) => {
  const videoId = c.req.query("videoId");
  if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid videoId" } }, 400);
  }

  const url = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  let upstream: Response;
  try {
    upstream = await fetch(url);
  } catch {
    return c.json({ error: { code: "UPSTREAM_ERROR", message: "Failed to fetch thumbnail" } }, 502);
  }

  if (!upstream.ok) {
    return c.json({ error: { code: "UPSTREAM_ERROR", message: "Upstream returned an error" } }, 502);
  }

  const body = await upstream.arrayBuffer();
  return c.body(body, 200, {
    "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
    "Cache-Control": "public, max-age=86400",
  });
});
