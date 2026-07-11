import { describe, it, expect } from "vitest";
import { createTrack, createCustomField } from "./track";

describe("createTrack", () => {
  it("creates a track with an id and empty fields", () => {
    const t = createTrack();
    expect(t.id).toBeTruthy();
    expect(t).toMatchObject({
      title: "",
      artist: "",
      songLink: "",
      source: "",
      customFields: [],
    });
  });

  it("applies overrides", () => {
    const t = createTrack({ title: "Song A" });
    expect(t.title).toBe("Song A");
  });

  it("gives each track a distinct id", () => {
    expect(createTrack().id).not.toBe(createTrack().id);
  });
});

describe("createCustomField", () => {
  it("creates an empty custom field with an id", () => {
    const f = createCustomField();
    expect(f.id).toBeTruthy();
    expect(f).toMatchObject({ label: "", value: "" });
  });
});
