import { describe, it, expect } from "vitest";
import { resolveThumbnailSource } from "./thumbnailSource";

describe("resolveThumbnailSource", () => {
  it("YouTube は Data API で解決する", () => {
    expect(resolveThumbnailSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      kind: "youtube",
      videoId: "dQw4w9WgXcQ",
    });
    expect(resolveThumbnailSource("https://youtu.be/dQw4w9WgXcQ")).toEqual({
      kind: "youtube",
      videoId: "dQw4w9WgXcQ",
    });
  });

  it("Spotify は oEmbed で解決する", () => {
    const source = resolveThumbnailSource(
      "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=abc"
    );

    expect(source).toEqual({
      kind: "oembed",
      endpoint:
        "https://open.spotify.com/oembed?url=" +
        encodeURIComponent("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"),
    });
  });

  it("SoundCloud は oEmbed で解決する", () => {
    const source = resolveThumbnailSource("https://soundcloud.com/forss/flickermood?in=x/sets/y");

    expect(source).toEqual({
      kind: "oembed",
      endpoint:
        "https://soundcloud.com/oembed?format=json&url=" +
        encodeURIComponent("https://soundcloud.com/forss/flickermood"),
    });
  });

  // 任意の URL を中継すると踏み台になるため、対応外は必ず null にする。
  it("対応していない URL は null", () => {
    expect(resolveThumbnailSource("https://www.nicovideo.jp/watch/sm9")).toBeNull();
    expect(resolveThumbnailSource("https://example.com/image.png")).toBeNull();
    expect(resolveThumbnailSource("")).toBeNull();
  });
});
