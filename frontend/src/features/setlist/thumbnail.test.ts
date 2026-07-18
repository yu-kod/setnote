import { describe, it, expect } from "vitest";
import { getYouTubeVideoId, getThumbnailProxyUrl } from "./thumbnail";

describe("getYouTubeVideoId", () => {
  it("extracts the video ID from a watch?v= link", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts the video ID from a youtu.be link", () => {
    expect(getYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts the video ID from an embed link", () => {
    expect(getYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for a Spotify link", () => {
    expect(getYouTubeVideoId("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(getYouTubeVideoId("")).toBeNull();
  });
});

describe("getThumbnailProxyUrl", () => {
  it("returns the proxy URL for a YouTube link", () => {
    expect(getThumbnailProxyUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "/api/proxy/thumbnail?videoId=dQw4w9WgXcQ"
    );
  });

  it("returns null for a non-YouTube link", () => {
    expect(getThumbnailProxyUrl("https://soundcloud.com/artist/track")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(getThumbnailProxyUrl("")).toBeNull();
  });
});
