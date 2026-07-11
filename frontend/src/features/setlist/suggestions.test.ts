import { describe, it, expect } from "vitest";
import { collectTrackSuggestions } from "./suggestions";
import type { Setlist, Track } from "./types";

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

function setlist(overrides: Partial<Setlist>): Setlist {
  return {
    id: "s",
    userId: "u",
    name: "S",
    artistName: null,
    eventName: null,
    eventLink: null,
    eventDate: null,
    tracks: [],
    status: "draft",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("collectTrackSuggestions", () => {
  it("collects unique tracks by title, skipping empty titles", () => {
    const result = collectTrackSuggestions([
      setlist({
        tracks: [track({ id: "a", title: "Song A" }), track({ id: "blank", title: "  " })],
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ title: "Song A" });
  });

  it("keeps the representative from the most recently updated setlist for a duplicate title", () => {
    const older = setlist({
      id: "old",
      updatedAt: "2026-01-01T00:00:00Z",
      tracks: [track({ id: "o", title: "Dup", artist: "Old Artist", songLink: "old-link" })],
    });
    const newer = setlist({
      id: "new",
      updatedAt: "2026-06-01T00:00:00Z",
      tracks: [track({ id: "n", title: "Dup", artist: "New Artist", songLink: "new-link" })],
    });

    // 入力順が古い→新しいでも、updatedAt が新しい方が代表になる
    const result = collectTrackSuggestions([older, newer]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ title: "Dup", artist: "New Artist", songLink: "new-link" });
  });
});
