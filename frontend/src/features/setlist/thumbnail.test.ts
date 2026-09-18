import { describe, it, expect } from "vitest";
import { getThumbnailProxyUrl } from "./thumbnail";

describe("getThumbnailProxyUrl", () => {
  it("YouTube のリンクはプロキシ経由で取る", () => {
    expect(getThumbnailProxyUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      `/api/proxy/thumbnail?url=${encodeURIComponent("https://youtu.be/dQw4w9WgXcQ")}`
    );
  });

  it("Spotify のリンクもプロキシ経由で取る", () => {
    const link = "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT";

    expect(getThumbnailProxyUrl(link)).toBe(`/api/proxy/thumbnail?url=${encodeURIComponent(link)}`);
  });

  it("SoundCloud のリンクもプロキシ経由で取る", () => {
    const link = "https://soundcloud.com/artist/track";

    expect(getThumbnailProxyUrl(link)).toBe(`/api/proxy/thumbnail?url=${encodeURIComponent(link)}`);
  });

  // ニコニコ動画は公式のサムネイル取得経路がないため対象外。
  it("ニコニコ動画のリンクは null", () => {
    expect(getThumbnailProxyUrl("https://www.nicovideo.jp/watch/sm9")).toBeNull();
  });

  it("対応していないリンクは null", () => {
    expect(getThumbnailProxyUrl("https://example.com/song")).toBeNull();
    expect(getThumbnailProxyUrl("")).toBeNull();
  });
});
