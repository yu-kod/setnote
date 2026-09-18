import { describe, it, expect } from "vitest";
import { sortSetlists, filterSetlists } from "./browse";
import type { Setlist } from "./types";

function buildSetlist(overrides: Partial<Setlist> = {}): Setlist {
  return {
    id: "a",
    userId: "u1",
    name: "Set",
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

describe("sortSetlists", () => {
  it("orders by most recently updated first", () => {
    const older = buildSetlist({ id: "older", updatedAt: "2026-07-01T00:00:00Z" });
    const newer = buildSetlist({ id: "newer", updatedAt: "2026-08-01T00:00:00Z" });

    expect(sortSetlists([older, newer], "updated").map((s) => s.id)).toEqual(["newer", "older"]);
  });

  it("orders by most recent event date first", () => {
    const spring = buildSetlist({ id: "spring", eventDate: "2026-03-20" });
    const summer = buildSetlist({ id: "summer", eventDate: "2026-08-14" });

    expect(sortSetlists([spring, summer], "eventDate").map((s) => s.id)).toEqual([
      "summer",
      "spring",
    ]);
  });

  it("puts setlists without an event date last, most recently updated first among them", () => {
    const dated = buildSetlist({ id: "dated", eventDate: "2026-03-20" });
    const undatedOld = buildSetlist({ id: "undated-old", updatedAt: "2026-07-01T00:00:00Z" });
    const undatedNew = buildSetlist({ id: "undated-new", updatedAt: "2026-08-01T00:00:00Z" });

    expect(sortSetlists([undatedOld, dated, undatedNew], "eventDate").map((s) => s.id)).toEqual([
      "dated",
      "undated-new",
      "undated-old",
    ]);
  });

  it("falls back to the most recently updated when two setlists share an event date", () => {
    const older = buildSetlist({
      id: "older",
      eventDate: "2026-08-14",
      updatedAt: "2026-07-01T00:00:00Z",
    });
    const newer = buildSetlist({
      id: "newer",
      eventDate: "2026-08-14",
      updatedAt: "2026-08-01T00:00:00Z",
    });

    expect(sortSetlists([older, newer], "eventDate").map((s) => s.id)).toEqual(["newer", "older"]);
  });

  it("does not mutate the given array", () => {
    const first = buildSetlist({ id: "first", updatedAt: "2026-07-01T00:00:00Z" });
    const second = buildSetlist({ id: "second", updatedAt: "2026-08-01T00:00:00Z" });
    const input = [first, second];

    sortSetlists(input, "updated");

    expect(input.map((s) => s.id)).toEqual(["first", "second"]);
  });
});

describe("filterSetlists", () => {
  it("returns every setlist when the query is blank", () => {
    const a = buildSetlist({ id: "a" });
    const b = buildSetlist({ id: "b" });

    expect(filterSetlists([a, b], "   ").map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("keeps setlists whose name contains the query", () => {
    const hit = buildSetlist({ id: "hit", name: "Summer Festival Set" });
    const miss = buildSetlist({ id: "miss", name: "Club Night Mix" });

    expect(filterSetlists([hit, miss], "festival").map((s) => s.id)).toEqual(["hit"]);
  });

  it("keeps setlists whose event name contains the query", () => {
    const hit = buildSetlist({ id: "hit", name: "Set", eventName: "Techno Bunker" });
    const miss = buildSetlist({ id: "miss", name: "Set", eventName: null });

    expect(filterSetlists([hit, miss], "bunker").map((s) => s.id)).toEqual(["hit"]);
  });

  it("ignores case and full-width / half-width differences", () => {
    const setlist = buildSetlist({ id: "hit", name: "ＴＥＣＨＮＯ Night" });

    expect(filterSetlists([setlist], "techno").map((s) => s.id)).toEqual(["hit"]);
  });

  it("returns nothing when no setlist matches", () => {
    const setlist = buildSetlist({ id: "a", name: "Club Night Mix" });

    expect(filterSetlists([setlist], "festival")).toEqual([]);
  });
});
