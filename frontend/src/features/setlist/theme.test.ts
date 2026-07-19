import { describe, it, expect } from "vitest";
import { COLOR_PRESETS, DECORATION_OPTIONS, getColorPreset } from "./theme";

describe("COLOR_PRESETS", () => {
  it("contains at least 3 presets", () => {
    expect(COLOR_PRESETS.length).toBeGreaterThanOrEqual(3);
  });

  it("has a default preset with id 'dark'", () => {
    const dark = COLOR_PRESETS.find((p) => p.id === "dark");
    expect(dark).toBeDefined();
    expect(dark!.background).toBe("#1a1a1a");
  });

  it("each preset has all required color fields including trackNumber and decorationColor", () => {
    for (const preset of COLOR_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.label).toBeTruthy();
      expect(preset.background).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.card).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.title).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.event).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.trackTitle).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.trackArtist).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.trackNumber).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.watermark).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.decorationColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("DECORATION_OPTIONS", () => {
  it("contains at least 3 options", () => {
    expect(DECORATION_OPTIONS.length).toBeGreaterThanOrEqual(3);
  });

  it("each option has motif and label", () => {
    for (const opt of DECORATION_OPTIONS) {
      expect(opt.label).toBeTruthy();
      expect(["sparkle", "bars", "dots"]).toContain(opt.motif);
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
