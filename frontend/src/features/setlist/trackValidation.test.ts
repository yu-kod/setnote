import { describe, it, expect } from "vitest";
import { findEmptyTitleTracks, hasEmptyTitleTracks } from "./trackValidation";
import type { Track } from "./types";

function track(overrides: Partial<Track> = {}): Track {
  return {
    id: "t",
    title: "Song",
    artist: "",
    songLink: "",
    source: "",
    customFields: [],
    ...overrides,
  };
}

describe("findEmptyTitleTracks", () => {
  it("returns empty array when no tracks", () => {
    expect(findEmptyTitleTracks([])).toEqual([]);
  });

  it("returns empty array when all tracks have titles", () => {
    expect(findEmptyTitleTracks([track({ title: "A" })])).toEqual([]);
  });

  it("returns index of track with empty title", () => {
    expect(findEmptyTitleTracks([track({ title: "" })])).toEqual([0]);
  });

  it("treats whitespace-only title as empty", () => {
    expect(findEmptyTitleTracks([track({ title: "  " })])).toEqual([0]);
  });

  it("returns multiple indices", () => {
    const tracks = [
      track({ title: "A" }),
      track({ title: "" }),
      track({ title: "B" }),
      track({ title: "  " }),
    ];
    expect(findEmptyTitleTracks(tracks)).toEqual([1, 3]);
  });
});

describe("hasEmptyTitleTracks", () => {
  it("returns false when no tracks", () => {
    expect(hasEmptyTitleTracks([])).toBe(false);
  });

  it("returns false when all tracks have titles", () => {
    expect(hasEmptyTitleTracks([track({ title: "A" })])).toBe(false);
  });

  it("returns true when any track has empty title", () => {
    expect(hasEmptyTitleTracks([track({ title: "" })])).toBe(true);
  });

  it("returns true for whitespace-only title", () => {
    expect(hasEmptyTitleTracks([track({ title: "  " })])).toBe(true);
  });
});
