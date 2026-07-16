import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

describe("parseTracksFromImage", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreate.mockReset();
  });

  it("throws when ANTHROPIC_API_KEY is not set", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const { parseTracksFromImage } = await import("./image-parser");
    await expect(parseTracksFromImage("base64data", "image/png")).rejects.toThrow(
      "ANTHROPIC_API_KEY is not configured"
    );
  });

  it("returns parsed tracks from Claude Vision response", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '[{"title":"Who?","artist":"Azari"},{"title":"ブレインロット","artist":"東京真中"}]',
        },
      ],
    });

    const { parseTracksFromImage } = await import("./image-parser");
    const result = await parseTracksFromImage("base64data", "image/png");

    expect(result).toEqual([
      { title: "Who?", artist: "Azari" },
      { title: "ブレインロット", artist: "東京真中" },
    ]);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
      })
    );
  });

  it("extracts JSON from markdown code block response", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '```json\n[{"title":"test","artist":"a"}]\n```',
        },
      ],
    });

    const { parseTracksFromImage } = await import("./image-parser");
    const result = await parseTracksFromImage("base64data", "image/jpeg");

    expect(result).toEqual([{ title: "test", artist: "a" }]);
  });

  it("returns empty array when response has no text block", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockCreate.mockResolvedValue({ content: [] });

    const { parseTracksFromImage } = await import("./image-parser");
    const result = await parseTracksFromImage("base64data", "image/png");

    expect(result).toEqual([]);
  });

  it("returns empty array when response text has no JSON", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "画像からトラックを読み取れませんでした" }],
    });

    const { parseTracksFromImage } = await import("./image-parser");
    const result = await parseTracksFromImage("base64data", "image/png");

    expect(result).toEqual([]);
  });

  it("filters out items without title field", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '[{"title":"valid","artist":"a"},{"artist":"no-title"},{"title":"also-valid"}]',
        },
      ],
    });

    const { parseTracksFromImage } = await import("./image-parser");
    const result = await parseTracksFromImage("base64data", "image/png");

    expect(result).toEqual([
      { title: "valid", artist: "a" },
      { title: "also-valid", artist: "" },
    ]);
  });

  it("defaults artist to empty string when missing", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '[{"title":"no-artist"}]',
        },
      ],
    });

    const { parseTracksFromImage } = await import("./image-parser");
    const result = await parseTracksFromImage("base64data", "image/png");

    expect(result).toEqual([{ title: "no-artist", artist: "" }]);
  });

  it("returns empty array when parsed JSON is not an array", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '{"title":"not-an-array"}',
        },
      ],
    });

    const { parseTracksFromImage } = await import("./image-parser");
    const result = await parseTracksFromImage("base64data", "image/png");

    expect(result).toEqual([]);
  });

  it("returns empty array when JSON parse fails", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: "[invalid json content]",
        },
      ],
    });

    const { parseTracksFromImage } = await import("./image-parser");
    const result = await parseTracksFromImage("base64data", "image/png");

    expect(result).toEqual([]);
  });
});
