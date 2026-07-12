import { describe, it, expect, beforeEach } from "vitest";
import { getLikedTrackIds, markLiked } from "./likes";

beforeEach(() => {
  localStorage.clear();
});

describe("likes (localStorage)", () => {
  it("returns an empty set when nothing has been liked", () => {
    expect(getLikedTrackIds("s1")).toEqual(new Set());
  });

  it("remembers a liked track for the setlist", () => {
    markLiked("s1", "t1");
    expect(getLikedTrackIds("s1").has("t1")).toBe(true);
  });

  it("keeps likes separate per setlist", () => {
    markLiked("s1", "t1");
    expect(getLikedTrackIds("s2").has("t1")).toBe(false);
  });

  it("does not duplicate a track liked twice", () => {
    markLiked("s1", "t1");
    markLiked("s1", "t1");
    expect([...getLikedTrackIds("s1")]).toEqual(["t1"]);
  });

  it("tolerates malformed stored data", () => {
    localStorage.setItem("setnote_liked_s1", "not json");
    expect(getLikedTrackIds("s1")).toEqual(new Set());
  });
});
