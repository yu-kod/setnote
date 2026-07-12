import { describe, it, expect } from "vitest";
import { summarizeUsage, topBars } from "./summary";
import type { TrackUsage } from "./api";

function usage(overrides: Partial<TrackUsage>): TrackUsage {
  return { title: "t", artist: "", count: 1, ...overrides };
}

describe("summarizeUsage", () => {
  it("returns zeros and no top song for empty usage", () => {
    expect(summarizeUsage([])).toEqual({ uniqueSongs: 0, totalPlays: 0, topSong: null });
  });

  it("counts unique songs, sums total plays, and picks the most played", () => {
    const result = summarizeUsage([
      usage({ title: "A", count: 5 }),
      usage({ title: "B", count: 2 }),
      usage({ title: "C", count: 3 }),
    ]);

    expect(result.uniqueSongs).toBe(3);
    expect(result.totalPlays).toBe(10);
    expect(result.topSong).toEqual(usage({ title: "A", count: 5 }));
  });

  it("picks the most played regardless of input order", () => {
    const result = summarizeUsage([
      usage({ title: "A", count: 2 }),
      usage({ title: "B", count: 9 }),
    ]);
    expect(result.topSong).toEqual(usage({ title: "B", count: 9 }));
  });
});

describe("topBars", () => {
  it("returns an empty array for empty usage", () => {
    expect(topBars([])).toEqual([]);
  });

  it("sorts by count desc and scales ratio against the max", () => {
    const result = topBars([
      usage({ title: "A", count: 2 }),
      usage({ title: "B", count: 8 }),
      usage({ title: "C", count: 4 }),
    ]);

    expect(result.map((b) => b.title)).toEqual(["B", "C", "A"]);
    expect(result.map((b) => b.ratio)).toEqual([1, 0.5, 0.25]);
  });

  it("limits the number of bars", () => {
    const many = Array.from({ length: 12 }, (_, i) => usage({ title: `S${i}`, count: 12 - i }));
    expect(topBars(many, 5)).toHaveLength(5);
  });

  it("defaults the limit to 8", () => {
    const many = Array.from({ length: 12 }, (_, i) => usage({ title: `S${i}`, count: 12 - i }));
    expect(topBars(many)).toHaveLength(8);
  });

  it("uses a zero ratio when every count is zero", () => {
    expect(topBars([usage({ title: "Z", count: 0 })])).toEqual([
      { title: "Z", artist: "", count: 0, ratio: 0 },
    ]);
  });
});
