import { describe, it, expect } from "vitest";
import { COLOR_PRESETS, DECORATION_PRESETS, getColorPreset, getDecorationPreset } from "./theme";

describe("COLOR_PRESETS", () => {
  it("contains at least 3 presets", () => {
    expect(COLOR_PRESETS.length).toBeGreaterThanOrEqual(3);
  });

  it("has a default preset with id 'dark'", () => {
    const dark = COLOR_PRESETS.find((p) => p.id === "dark");
    expect(dark).toBeDefined();
    expect(dark!.background).toBe("#1a1a1a");
  });

  it("each preset has all required color fields", () => {
    for (const preset of COLOR_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.label).toBeTruthy();
      expect(preset.background).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.title).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.event).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.trackTitle).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.trackArtist).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.watermark).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("DECORATION_PRESETS", () => {
  it("contains at least 3 presets", () => {
    expect(DECORATION_PRESETS.length).toBeGreaterThanOrEqual(3);
  });

  it("has a default preset with id 'none'", () => {
    const none = DECORATION_PRESETS.find((p) => p.id === "none");
    expect(none).toBeDefined();
    expect(none!.pattern).toBe("none");
  });

  it("each preset has required fields", () => {
    for (const preset of DECORATION_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.label).toBeTruthy();
      expect(["none", "dots", "grid", "diagonal", "border"].includes(preset.pattern)).toBe(true);
    }
  });
});

describe("getColorPreset", () => {
  it("returns the preset matching the given id", () => {
    const preset = getColorPreset("dark");
    expect(preset.id).toBe("dark");
  });

  it("returns the default dark preset for unknown id", () => {
    const preset = getColorPreset("nonexistent");
    expect(preset.id).toBe("dark");
  });
});

describe("getDecorationPreset", () => {
  it("returns the preset matching the given id", () => {
    const preset = getDecorationPreset("none");
    expect(preset.id).toBe("none");
  });

  it("returns the default none preset for unknown id", () => {
    const preset = getDecorationPreset("nonexistent");
    expect(preset.id).toBe("none");
  });
});
