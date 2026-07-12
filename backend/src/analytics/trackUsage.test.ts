import { describe, it, expect } from "vitest";
import { aggregateTrackUsage } from "./trackUsage";

describe("aggregateTrackUsage", () => {
  it("returns an empty array when there are no setlists", () => {
    expect(aggregateTrackUsage([])).toEqual([]);
  });

  it("counts a title once per setlist that contains it", () => {
    const result = aggregateTrackUsage([
      { tracks: [{ title: "Song A" }] },
      { tracks: [{ title: "Song A" }] },
      { tracks: [{ title: "Song B" }] },
    ]);

    expect(result).toEqual([
      { title: "Song A", artist: "", count: 2 },
      { title: "Song B", artist: "", count: 1 },
    ]);
  });

  it("counts a duplicated title within a single setlist only once", () => {
    const result = aggregateTrackUsage([{ tracks: [{ title: "Encore" }, { title: "Encore" }] }]);

    expect(result).toEqual([{ title: "Encore", artist: "", count: 1 }]);
  });

  it("trims titles and skips empty ones", () => {
    const result = aggregateTrackUsage([
      { tracks: [{ title: "  Song A  " }, { title: "   " }, { title: "" }] },
    ]);

    expect(result).toEqual([{ title: "Song A", artist: "", count: 1 }]);
  });

  it("keeps a representative artist for display", () => {
    const result = aggregateTrackUsage([
      { tracks: [{ title: "Song A", artist: "DJ X" }] },
      { tracks: [{ title: "Song A", artist: "DJ Y" }] },
    ]);

    expect(result).toEqual([{ title: "Song A", artist: "DJ X", count: 2 }]);
  });

  it("backfills a missing artist from a later setlist", () => {
    const result = aggregateTrackUsage([
      { tracks: [{ title: "Song A" }] },
      { tracks: [{ title: "Song A", artist: "DJ Y" }] },
    ]);

    expect(result).toEqual([{ title: "Song A", artist: "DJ Y", count: 2 }]);
  });

  it("sorts by count desc, then title asc", () => {
    const result = aggregateTrackUsage([
      { tracks: [{ title: "B" }, { title: "C" }] },
      { tracks: [{ title: "C" }, { title: "A" }] },
    ]);

    expect(result.map((r) => r.title)).toEqual(["C", "A", "B"]);
  });

  it("tolerates setlists without a tracks field", () => {
    expect(aggregateTrackUsage([{}])).toEqual([]);
  });

  it("skips tracks that have no title field", () => {
    expect(aggregateTrackUsage([{ tracks: [{ artist: "DJ X" }] }])).toEqual([]);
  });
});
