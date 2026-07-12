import { describe, it, expect } from "vitest";
import { aggregateLikes, type LikesInput } from "./likes";

describe("aggregateLikes", () => {
  it("returns an empty array when no setlists are given", () => {
    expect(aggregateLikes([])).toEqual([]);
  });

  it("aggregates like counts across setlists by trackId, resolving title/artist from tracks", () => {
    const setlists: LikesInput[] = [
      {
        tracks: [
          { id: "t1", title: "Song A", artist: "DJ X" },
          { id: "t2", title: "Song B", artist: "DJ Y" },
        ],
        likeCounts: { t1: 5, t2: 3 },
      },
      {
        tracks: [{ id: "t3", title: "Song A", artist: "DJ X" }],
        likeCounts: { t3: 2 },
      },
    ];

    const result = aggregateLikes(setlists);

    expect(result).toEqual([
      { title: "Song A", artist: "DJ X", likes: 7 },
      { title: "Song B", artist: "DJ Y", likes: 3 },
    ]);
  });

  it("skips tracks with no likes", () => {
    const setlists: LikesInput[] = [
      {
        tracks: [
          { id: "t1", title: "Song A", artist: "" },
          { id: "t2", title: "Song B", artist: "" },
        ],
        likeCounts: { t1: 0, t2: 3 },
      },
    ];

    expect(aggregateLikes(setlists)).toEqual([{ title: "Song B", artist: "", likes: 3 }]);
  });

  it("handles missing likeCounts gracefully", () => {
    const setlists: LikesInput[] = [{ tracks: [{ id: "t1", title: "Song A", artist: "" }] }];

    expect(aggregateLikes(setlists)).toEqual([]);
  });

  it("handles missing tracks gracefully", () => {
    const setlists: LikesInput[] = [{ likeCounts: { t1: 5 } }];

    expect(aggregateLikes(setlists)).toEqual([]);
  });

  it("sorts by likes descending, then title ascending", () => {
    const setlists: LikesInput[] = [
      {
        tracks: [
          { id: "t1", title: "Zebra", artist: "" },
          { id: "t2", title: "Alpha", artist: "" },
          { id: "t3", title: "Beta", artist: "" },
        ],
        likeCounts: { t1: 2, t2: 2, t3: 5 },
      },
    ];

    const result = aggregateLikes(setlists);
    expect(result.map((r) => r.title)).toEqual(["Beta", "Alpha", "Zebra"]);
  });

  it("merges likes for the same title across setlists", () => {
    const setlists: LikesInput[] = [
      {
        tracks: [{ id: "t1", title: "Song A", artist: "X" }],
        likeCounts: { t1: 3 },
      },
      {
        tracks: [{ id: "t9", title: "Song A", artist: "Y" }],
        likeCounts: { t9: 4 },
      },
    ];

    expect(aggregateLikes(setlists)).toEqual([{ title: "Song A", artist: "X", likes: 7 }]);
  });

  it("ignores likeCounts entries that have no matching track", () => {
    const setlists: LikesInput[] = [
      {
        tracks: [{ id: "t1", title: "Song A", artist: "" }],
        likeCounts: { t1: 2, orphan: 10 },
      },
    ];

    expect(aggregateLikes(setlists)).toEqual([{ title: "Song A", artist: "", likes: 2 }]);
  });

  it("skips tracks with undefined or empty title", () => {
    const setlists: LikesInput[] = [
      {
        tracks: [
          { id: "t1", title: undefined, artist: "X" },
          { id: "t2", title: "  ", artist: "Y" },
        ],
        likeCounts: { t1: 5, t2: 3 },
      },
    ];

    expect(aggregateLikes(setlists)).toEqual([]);
  });

  it("defaults artist to empty string when undefined", () => {
    const setlists: LikesInput[] = [
      {
        tracks: [{ id: "t1", title: "Song A", artist: undefined }],
        likeCounts: { t1: 4 },
      },
    ];

    expect(aggregateLikes(setlists)).toEqual([{ title: "Song A", artist: "", likes: 4 }]);
  });
});
