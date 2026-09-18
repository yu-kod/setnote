import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadDraft, saveDraft, clearDraft, hasUnsavedChanges, type SetlistDraft } from "./draft";
import type { Track } from "./types";

function buildTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: "t1",
    title: "Track",
    artist: "",
    songLink: "",
    source: "",
    customFields: [],
    groupId: null,
    ...overrides,
  };
}

function buildDraft(overrides: Partial<SetlistDraft> = {}): SetlistDraft {
  return {
    name: "My Set",
    artistName: "",
    eventName: "",
    eventLink: "",
    eventDate: "",
    tracks: [buildTrack()],
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("saveDraft / loadDraft", () => {
  it("returns the draft that was saved for that setlist", () => {
    const draft = buildDraft({ name: "Renamed" });

    saveDraft("s1", draft);

    expect(loadDraft("s1")).toEqual(draft);
  });

  it("keeps drafts of different setlists apart", () => {
    saveDraft("s1", buildDraft({ name: "One" }));
    saveDraft("s2", buildDraft({ name: "Two" }));

    expect(loadDraft("s1")?.name).toBe("One");
    expect(loadDraft("s2")?.name).toBe("Two");
  });

  it("returns null when there is no draft", () => {
    expect(loadDraft("s1")).toBeNull();
  });

  it("returns null when the stored draft is unreadable", () => {
    localStorage.setItem("setnote_draft_s1", "{ not json");

    expect(loadDraft("s1")).toBeNull();
  });

  it("does not throw when storage rejects the write", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => saveDraft("s1", buildDraft())).not.toThrow();

    setItem.mockRestore();
  });
});

describe("clearDraft", () => {
  it("removes the draft of that setlist only", () => {
    saveDraft("s1", buildDraft());
    saveDraft("s2", buildDraft());

    clearDraft("s1");

    expect(loadDraft("s1")).toBeNull();
    expect(loadDraft("s2")).not.toBeNull();
  });

  it("does not throw when storage rejects the removal", () => {
    const removeItem = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => clearDraft("s1")).not.toThrow();

    removeItem.mockRestore();
  });
});

describe("hasUnsavedChanges", () => {
  it("is false when the draft matches what was saved", () => {
    expect(hasUnsavedChanges(buildDraft(), buildDraft())).toBe(false);
  });

  it("is true when a field differs", () => {
    expect(hasUnsavedChanges(buildDraft({ name: "Renamed" }), buildDraft())).toBe(true);
  });

  it("is true when the tracks differ", () => {
    expect(
      hasUnsavedChanges(buildDraft({ tracks: [buildTrack({ title: "Changed" })] }), buildDraft())
    ).toBe(true);
  });
});
