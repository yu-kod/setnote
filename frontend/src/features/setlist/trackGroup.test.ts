import { describe, it, expect } from "vitest";
import { groupTracks, toggleGroup } from "./trackGroup";
import type { Track } from "./types";

function buildTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: "t1",
    title: "Song",
    artist: "Artist",
    songLink: "",
    source: "",
    customFields: [],
    groupId: null,
    ...overrides,
  };
}

describe("groupTracks", () => {
  it("returns each ungrouped track as a single-item group", () => {
    const tracks = [buildTrack({ id: "a" }), buildTrack({ id: "b" })];
    const groups = groupTracks(tracks);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual([tracks[0]]);
    expect(groups[1]).toEqual([tracks[1]]);
  });

  it("groups adjacent tracks with the same groupId", () => {
    const tracks = [
      buildTrack({ id: "a", groupId: "g1" }),
      buildTrack({ id: "b", groupId: "g1" }),
      buildTrack({ id: "c" }),
    ];
    const groups = groupTracks(tracks);
    expect(groups).toHaveLength(2);
    expect(groups[0].map((t) => t.id)).toEqual(["a", "b"]);
    expect(groups[1].map((t) => t.id)).toEqual(["c"]);
  });

  it("does not group non-adjacent tracks with the same groupId", () => {
    const tracks = [
      buildTrack({ id: "a", groupId: "g1" }),
      buildTrack({ id: "b" }),
      buildTrack({ id: "c", groupId: "g1" }),
    ];
    const groups = groupTracks(tracks);
    expect(groups).toHaveLength(3);
  });

  it("returns empty array for empty input", () => {
    expect(groupTracks([])).toEqual([]);
  });
});

describe("toggleGroup", () => {
  it("links two ungrouped adjacent tracks with a shared groupId", () => {
    const tracks = [buildTrack({ id: "a" }), buildTrack({ id: "b" }), buildTrack({ id: "c" })];
    const result = toggleGroup(tracks, 0);
    expect(result[0].groupId).toBeTruthy();
    expect(result[0].groupId).toBe(result[1].groupId);
    expect(result[2].groupId).toBeNull();
  });

  it("unlinks two grouped adjacent tracks", () => {
    const tracks = [
      buildTrack({ id: "a", groupId: "g1" }),
      buildTrack({ id: "b", groupId: "g1" }),
    ];
    const result = toggleGroup(tracks, 0);
    expect(result[0].groupId).toBeNull();
    expect(result[1].groupId).toBeNull();
  });

  it("returns the same array when gapIndex is out of bounds", () => {
    const tracks = [buildTrack({ id: "a" })];
    expect(toggleGroup(tracks, 0)).toEqual(tracks);
    expect(toggleGroup(tracks, -1)).toEqual(tracks);
  });

  it("joins an ungrouped track into an existing group below", () => {
    const tracks = [
      buildTrack({ id: "a", groupId: "g1" }),
      buildTrack({ id: "b", groupId: "g1" }),
      buildTrack({ id: "c" }),
    ];
    const result = toggleGroup(tracks, 1);
    expect(result[0].groupId).toBe("g1");
    expect(result[1].groupId).toBe("g1");
    expect(result[2].groupId).toBe("g1");
  });

  it("joins an ungrouped track into an existing group above", () => {
    const tracks = [
      buildTrack({ id: "a" }),
      buildTrack({ id: "b", groupId: "g1" }),
      buildTrack({ id: "c", groupId: "g1" }),
    ];
    const result = toggleGroup(tracks, 0);
    expect(result[0].groupId).toBe("g1");
    expect(result[1].groupId).toBe("g1");
    expect(result[2].groupId).toBe("g1");
  });

  it("does not affect other tracks when unlinking a group", () => {
    const tracks = [
      buildTrack({ id: "a", groupId: "g1" }),
      buildTrack({ id: "b", groupId: "g1" }),
      buildTrack({ id: "c", groupId: "g2" }),
      buildTrack({ id: "d", groupId: "g2" }),
    ];
    const result = toggleGroup(tracks, 0);
    expect(result[0].groupId).toBeNull();
    expect(result[1].groupId).toBeNull();
    expect(result[2].groupId).toBe("g2");
    expect(result[3].groupId).toBe("g2");
  });
});
