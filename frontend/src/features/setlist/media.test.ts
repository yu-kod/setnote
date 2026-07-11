import { describe, it, expect } from "vitest";
import { getMediaEmbed } from "./media";

describe("getMediaEmbed", () => {
  it("returns a YouTube embed for a youtu.be link", () => {
    const embed = getMediaEmbed("https://youtu.be/dQw4w9WgXcQ");
    expect(embed).toEqual({
      type: "youtube",
      src: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      title: "YouTube",
    });
  });

  it("returns a YouTube embed for a watch?v= link", () => {
    expect(getMediaEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.type).toBe("youtube");
  });

  it("returns a Spotify embed for a track link", () => {
    const embed = getMediaEmbed("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT");
    expect(embed?.type).toBe("spotify");
    expect(embed?.src).toContain("open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT");
  });

  it("returns a SoundCloud embed for a track link", () => {
    const embed = getMediaEmbed("https://soundcloud.com/artist/some-track");
    expect(embed?.type).toBe("soundcloud");
    expect(embed?.src).toContain("w.soundcloud.com/player");
    expect(embed?.src).toContain(encodeURIComponent("https://soundcloud.com/artist/some-track"));
  });

  it("returns a niconico embed for a watch link", () => {
    const embed = getMediaEmbed("https://www.nicovideo.jp/watch/sm9");
    expect(embed).toEqual({
      type: "niconico",
      src: "https://embed.nicovideo.jp/watch/sm9",
      title: "niconico",
    });
  });

  it("returns null for an unrecognized url", () => {
    expect(getMediaEmbed("https://example.com/track")).toBeNull();
  });
});
