import { describe, it, expect } from "vitest";
import { aggregateContent } from "./content";

describe("aggregateContent", () => {
  it("returns zeros for an empty table", () => {
    expect(aggregateContent([])).toEqual({
      setlists: 0,
      published: 0,
      draft: 0,
      totalViews: 0,
      totalLikes: 0,
      totalTracks: 0,
      activeUsers: 0,
    });
  });

  it("counts published and draft setlists separately", () => {
    const stats = aggregateContent([
      { id: "a", status: "published" },
      { id: "b", status: "published" },
      { id: "c", status: "draft" },
    ]);

    expect(stats.setlists).toBe(3);
    expect(stats.published).toBe(2);
    expect(stats.draft).toBe(1);
  });

  it("treats a setlist with no status as a draft", () => {
    const stats = aggregateContent([{ id: "a" }]);

    expect(stats.published).toBe(0);
    expect(stats.draft).toBe(1);
  });

  it("sums view counts, skipping setlists that have never been viewed", () => {
    const stats = aggregateContent([
      { id: "a", viewCount: 12 },
      { id: "b" },
      { id: "c", viewCount: 3 },
    ]);

    expect(stats.totalViews).toBe(15);
  });

  it("sums likes across every track of every setlist", () => {
    const stats = aggregateContent([
      { id: "a", likeCounts: { t1: 2, t2: 5 } },
      { id: "b", likeCounts: {} },
      { id: "c" },
      { id: "d", likeCounts: { t3: 1 } },
    ]);

    expect(stats.totalLikes).toBe(8);
  });

  it("sums the number of tracks across setlists", () => {
    const stats = aggregateContent([
      { id: "a", tracks: [{}, {}, {}] },
      { id: "b", tracks: [] },
      { id: "c" },
    ]);

    expect(stats.totalTracks).toBe(3);
  });

  it("counts distinct owners as active users", () => {
    const stats = aggregateContent([
      { id: "a", userId: "u1" },
      { id: "b", userId: "u1" },
      { id: "c", userId: "u2" },
      { id: "d" },
    ]);

    expect(stats.activeUsers).toBe(2);
  });
});
