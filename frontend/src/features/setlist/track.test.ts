import { describe, it, expect } from "vitest";
import { createTrack, createCustomField, moveTrack } from "./track";

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

describe("moveTrack", () => {
  const build = (id: string) => createTrack({ id, title: id });

  it("moves a track to the position of another", () => {
    const list = [build("a"), build("b"), build("c")];
    expect(moveTrack(list, "a", "c").map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("returns the same list when the active id is not found", () => {
    const list = [build("a"), build("b")];
    expect(moveTrack(list, "x", "b")).toBe(list);
  });

  it("returns the same list when the over id is not found", () => {
    const list = [build("a"), build("b")];
    expect(moveTrack(list, "a", "x")).toBe(list);
  });
});
