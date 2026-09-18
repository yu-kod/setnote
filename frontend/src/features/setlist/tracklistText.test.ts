import { describe, it, expect } from "vitest";
import { buildTracklistText } from "./tracklistText";
import type { Track } from "./types";

function buildTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: crypto.randomUUID(),
    title: "Track",
    artist: "",
    songLink: "",
    source: "",
    customFields: [],
    groupId: null,
    ...overrides,
  };
}

describe("buildTracklistText", () => {
  it("numbers the tracks and puts the artist after the title", () => {
    const text = buildTracklistText({
      name: "Friday Night Set",
      eventName: null,
      eventDate: null,
      publicUrl: null,
      tracks: [
        buildTrack({ title: "Track One", artist: "Artist A" }),
        buildTrack({ title: "Track Two", artist: "Artist B" }),
      ],
    });

    expect(text).toBe("Friday Night Set\n\n1. Track One — Artist A\n2. Track Two — Artist B");
  });

  it("omits the dash when a track has no artist", () => {
    const text = buildTracklistText({
      name: "Set",
      eventName: null,
      eventDate: null,
      publicUrl: null,
      tracks: [buildTrack({ title: "Nameless", artist: "" })],
    });

    expect(text).toBe("Set\n\n1. Nameless");
  });

  it("puts the event name and date under the setlist name", () => {
    const text = buildTracklistText({
      name: "Set",
      eventName: "Techno Bunker",
      eventDate: "2026-08-14",
      publicUrl: null,
      tracks: [buildTrack({ title: "Track One" })],
    });

    expect(text).toBe("Set\nTechno Bunker / 2026/8/14\n\n1. Track One");
  });

  it("shows the event name alone when there is no date", () => {
    const text = buildTracklistText({
      name: "Set",
      eventName: "Techno Bunker",
      eventDate: null,
      publicUrl: null,
      tracks: [buildTrack({ title: "Track One" })],
    });

    expect(text).toBe("Set\nTechno Bunker\n\n1. Track One");
  });

  it("shows the date alone when there is no event name", () => {
    const text = buildTracklistText({
      name: "Set",
      eventName: null,
      eventDate: "2026-08-14",
      publicUrl: null,
      tracks: [buildTrack({ title: "Track One" })],
    });

    expect(text).toBe("Set\n2026/8/14\n\n1. Track One");
  });

  it("marks a blended pair with a plus and keeps them under one number", () => {
    const text = buildTracklistText({
      name: "Set",
      eventName: null,
      eventDate: null,
      publicUrl: null,
      tracks: [
        buildTrack({ title: "Track One" }),
        buildTrack({ title: "Track Two", groupId: "g1" }),
        buildTrack({ title: "Track Three", groupId: "g1" }),
        buildTrack({ title: "Track Four" }),
      ],
    });

    expect(text).toBe("Set\n\n1. Track One\n2. Track Two\n + Track Three\n3. Track Four");
  });

  it("appends the public url when the setlist is published", () => {
    const text = buildTracklistText({
      name: "Set",
      eventName: null,
      eventDate: null,
      publicUrl: "https://setnote.yu-web.site/s/abc1234567",
      tracks: [buildTrack({ title: "Track One" })],
    });

    expect(text).toBe("Set\n\n1. Track One\n\nhttps://setnote.yu-web.site/s/abc1234567");
  });

  it("still produces the header when there are no tracks", () => {
    const text = buildTracklistText({
      name: "Set",
      eventName: null,
      eventDate: null,
      publicUrl: null,
      tracks: [],
    });

    expect(text).toBe("Set");
  });
});
