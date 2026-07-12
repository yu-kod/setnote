import { describe, it, expect, beforeEach } from "vitest";
import { getLikedTrackIds, markLiked, unmarkLiked } from "./likes";

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

  it("removes a like on unmark", () => {
    markLiked("s1", "t1");
    unmarkLiked("s1", "t1");
    expect(getLikedTrackIds("s1").has("t1")).toBe(false);
  });

  it("tolerates unmarking a track that was never liked", () => {
    expect(() => unmarkLiked("s1", "t1")).not.toThrow();
    expect(getLikedTrackIds("s1")).toEqual(new Set());
  });
});
