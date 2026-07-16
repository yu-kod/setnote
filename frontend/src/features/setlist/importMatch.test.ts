import { describe, it, expect } from "vitest";
import { matchImportedTracks } from "./importMatch";
import type { Track } from "./types";
import type { ParsedTrack } from "./api";

function track(overrides: Partial<Track>): Track {
  return {
    id: "s1",
    title: "",
    artist: "",
    songLink: "",
    source: "",
    customFields: [],
    ...overrides,
  };
}

describe("matchImportedTracks", () => {
  it("creates tracks with new IDs for each parsed track", () => {
    const parsed: ParsedTrack[] = [{ title: "Song A", artist: "DJ" }];
    const result = matchImportedTracks(parsed, []);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Song A");
    expect(result[0].artist).toBe("DJ");
    expect(result[0].id).toBeTruthy();
  });

  it("inherits suggestion fields when title matches", () => {
    const parsed: ParsedTrack[] = [{ title: "Song A", artist: "DJ" }];
    const suggestions = [
      track({
        id: "s1",
        title: "Song A",
        artist: "Original Artist",
        songLink: "https://example.com",
        source: "Beatport",
        customFields: [{ id: "c1", label: "BPM", value: "128" }],
      }),
    ];

    const result = matchImportedTracks(parsed, suggestions);

    expect(result[0].title).toBe("Song A");
    expect(result[0].artist).toBe("DJ");
    expect(result[0].songLink).toBe("https://example.com");
    expect(result[0].source).toBe("Beatport");
    expect(result[0].customFields).toEqual([{ id: "c1", label: "BPM", value: "128" }]);
    expect(result[0].id).not.toBe("s1");
  });

  it("returns plain track when no suggestion matches", () => {
    const parsed: ParsedTrack[] = [{ title: "Unknown", artist: "DJ" }];
    const suggestions = [track({ title: "Other Song" })];

    const result = matchImportedTracks(parsed, suggestions);

    expect(result[0].songLink).toBe("");
    expect(result[0].source).toBe("");
  });

  it("matches ignoring parentheses", () => {
    const parsed: ParsedTrack[] = [{ title: "Song A (Live)", artist: "" }];
    const suggestions = [
      track({ title: "Song A (Studio)", songLink: "https://link" }),
    ];

    const result = matchImportedTracks(parsed, suggestions);

    expect(result[0].songLink).toBe("https://link");
  });

  it("picks the first matching suggestion", () => {
    const parsed: ParsedTrack[] = [{ title: "Song A", artist: "" }];
    const suggestions = [
      track({ id: "first", title: "Song A", songLink: "first-link" }),
      track({ id: "second", title: "Song A", songLink: "second-link" }),
    ];

    const result = matchImportedTracks(parsed, suggestions);

    expect(result[0].songLink).toBe("first-link");
  });

  it("handles empty parsed title without crashing", () => {
    const parsed: ParsedTrack[] = [{ title: "", artist: "" }];
    const result = matchImportedTracks(parsed, []);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("");
  });

  it("handles empty suggestions array", () => {
    const parsed: ParsedTrack[] = [{ title: "Song", artist: "DJ" }];
    const result = matchImportedTracks(parsed, []);

    expect(result).toHaveLength(1);
    expect(result[0].songLink).toBe("");
  });

  it("matches multiple parsed tracks independently", () => {
    const parsed: ParsedTrack[] = [
      { title: "Song A", artist: "DJ1" },
      { title: "Song B", artist: "DJ2" },
    ];
    const suggestions = [
      track({ title: "Song A", songLink: "link-a" }),
    ];

    const result = matchImportedTracks(parsed, suggestions);

    expect(result).toHaveLength(2);
    expect(result[0].songLink).toBe("link-a");
    expect(result[1].songLink).toBe("");
  });
});
