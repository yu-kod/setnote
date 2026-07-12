import { describe, it, expect } from "vitest";
import { summarizeUsage } from "./summary";
import type { TrackUsage } from "./api";

function usage(overrides: Partial<TrackUsage>): TrackUsage {
  return { title: "t", artist: "", count: 1, ...overrides };
}

describe("summarizeUsage", () => {
  it("returns zeros and empty topSongs for empty usage", () => {
    expect(summarizeUsage([])).toEqual({ uniqueSongs: 0, totalPlays: 0, topSongs: [] });
  });

  it("counts unique songs, sums total plays, and picks top 3", () => {
    const result = summarizeUsage([
      usage({ title: "A", count: 5 }),
      usage({ title: "B", count: 2 }),
      usage({ title: "C", count: 3 }),
      usage({ title: "D", count: 1 }),
    ]);

    expect(result.uniqueSongs).toBe(4);
    expect(result.totalPlays).toBe(11);
    expect(result.topSongs).toEqual([
      usage({ title: "A", count: 5 }),
      usage({ title: "C", count: 3 }),
      usage({ title: "B", count: 2 }),
    ]);
  });

  it("returns fewer than 3 when there are fewer songs", () => {
    const result = summarizeUsage([usage({ title: "A", count: 2 })]);
    expect(result.topSongs).toHaveLength(1);
  });
});
