import { describe, it, expect } from "vitest";
import { matchTracks } from "./trackMatch";
import type { Track } from "./types";

function track(overrides: Partial<Track>): Track {
  return {
    id: "t",
    title: "",
    artist: "",
    songLink: "",
    source: "",
    customFields: [],
    ...overrides,
  };
}

describe("matchTracks", () => {
  it("returns nothing for an empty query", () => {
    expect(matchTracks([track({ title: "Song" })], "")).toEqual([]);
    expect(matchTracks([track({ title: "Song" })], "   ")).toEqual([]);
  });

  it("matches by case-insensitive substring (English)", () => {
    const tracks = [track({ id: "a", title: "Bohemian Rhapsody" })];
    expect(matchTracks(tracks, "bohe")).toHaveLength(1);
    expect(matchTracks(tracks, "RHAP")).toHaveLength(1);
  });

  it("matches hiragana query against a katakana title", () => {
    const result = matchTracks([track({ id: "k", title: "サクラ" })], "さくら");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ title: "サクラ" });
  });

  it("matches katakana query against a hiragana title", () => {
    const result = matchTracks([track({ id: "h", title: "さくら" })], "サク");
    expect(result).toHaveLength(1);
  });

  it("matches romaji query against a kana title", () => {
    const result = matchTracks([track({ id: "r", title: "サクラ" })], "sakura");
    expect(result).toHaveLength(1);
  });

  it("matches full-width English against half-width query", () => {
    const result = matchTracks([track({ id: "f", title: "ＡＢＣ" })], "abc");
    expect(result).toHaveLength(1);
  });

  it("does not match unrelated titles", () => {
    const result = matchTracks([track({ id: "x", title: "サクラ" })], "ゆき");
    expect(result).toHaveLength(0);
  });

  it("limits results to the given max", () => {
    const tracks = Array.from({ length: 10 }, (_, i) =>
      track({ id: `t${i}`, title: `Song ${i}` })
    );
    expect(matchTracks(tracks, "song", 8)).toHaveLength(8);
  });

  it("defaults the limit to 8", () => {
    const tracks = Array.from({ length: 12 }, (_, i) =>
      track({ id: `t${i}`, title: `Song ${i}` })
    );
    expect(matchTracks(tracks, "song")).toHaveLength(8);
  });
});
