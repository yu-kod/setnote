import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateLayout,
  renderShareImage,
  downloadBlob,
  type ShareImageInput,
  type LayoutResult,
} from "./shareImage";
import type { ColorPreset } from "./theme";

function buildInput(overrides: Partial<ShareImageInput> = {}): ShareImageInput {
  return {
    name: "Summer Vibes",
    eventName: "Summer Festival 2026",
    tracks: [
      { title: "Opening", artist: "DJ Test" },
      { title: "Main", artist: "DJ Test" },
    ],
    thumbnailCount: 1,
    ...overrides,
  };
}

function buildColors(overrides: Partial<ColorPreset> = {}): ColorPreset {
  return {
    id: "test",
    label: "Test",
    background: "#000000",
    card: "#111111",
    title: "#ff0000",
    event: "#00ff00",
    trackTitle: "#0000ff",
    trackArtist: "#ffff00",

    watermark: "#cccccc",
    decorationColor: "#ff00ff",
    ...overrides,
  };
}

function createMockCanvas() {
  const ctx = {
    fillStyle: "",
    font: "",
    textBaseline: "",
    textAlign: "",
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: "",
    fillRect: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    clip: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    rotate: vi.fn(),
    translate: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 50 }),
  };

  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue(ctx),
    toBlob: vi.fn((cb: (blob: Blob | null) => void) => {
      cb(new Blob(["fake"], { type: "image/png" }));
    }),
  };

  return { canvas, ctx };
}

describe("calculateLayout", () => {
  it("returns fixed 900x1200 canvas for Twitter vertical image", () => {
    const result: LayoutResult = calculateLayout(buildInput());
    expect(result.items).toBeInstanceOf(Array);
    expect(result.width).toBe(900);
    expect(result.height).toBe(1200);
  });

  it("always uses fixed 900 width regardless of content", () => {
    const short = calculateLayout(
      buildInput({ name: "A", tracks: [{ title: "B", artist: "" }], thumbnailCount: 0 })
    );
    const long = calculateLayout(
      buildInput({
        name: "あ".repeat(100),
        tracks: [{ title: "B", artist: "" }],
        thumbnailCount: 0,
      })
    );
    expect(short.width).toBe(900);
    expect(long.width).toBe(900);
  });

  it("applies color preset to layout items", () => {
    const colors = buildColors();
    const { items } = calculateLayout(buildInput(), undefined, colors);
    expect(items.find((i) => i.type === "title")!.color).toBe("#ff0000");
    expect(items.find((i) => i.type === "event")!.color).toBe("#00ff00");
    expect(items.find((i) => i.type === "trackTitle")!.color).toBe("#0000ff");
    expect(items.find((i) => i.type === "trackArtist")!.color).toBe("#ffff00");
  });

  it("uses default dark colors when no color preset is provided", () => {
    const { items } = calculateLayout(buildInput());
    expect(items.find((i) => i.type === "title")!.color).toBe("#f5f5f5");
  });

  it("places the setlist name at the top", () => {
    const { items } = calculateLayout(buildInput());
    const title = items.find((item) => item.type === "title");
    expect(title).toBeDefined();
    expect(title!.text).toBe("Summer Vibes");
    expect(title!.y).toBeLessThan(100);
  });

  it("places the event name below the title", () => {
    const { items } = calculateLayout(buildInput());
    const title = items.find((item) => item.type === "title")!;
    const event = items.find((item) => item.type === "event")!;
    expect(event.text).toBe("Summer Festival 2026");
    expect(event.y).toBeGreaterThan(title.y);
  });

  it("omits the event item when eventName is null", () => {
    const { items } = calculateLayout(buildInput({ eventName: null }));
    expect(items.find((item) => item.type === "event")).toBeUndefined();
  });

  it("places tracks below the header", () => {
    const { items } = calculateLayout(buildInput());
    const header = items.filter((item) => item.type === "title" || item.type === "event");
    const tracks = items.filter((item) => item.type === "trackTitle");
    const lowestHeader = Math.max(...header.map((h) => h.y));
    expect(tracks.length).toBe(2);
    expect(tracks[0].y).toBeGreaterThan(lowestHeader);
    expect(tracks[0].text).toBe("Opening");
  });

  it("places artist names below track title", () => {
    const { items } = calculateLayout(buildInput());
    const trackTitles = items.filter((item) => item.type === "trackTitle");
    const artists = items.filter((item) => item.type === "trackArtist");
    expect(artists.length).toBe(2);
    expect(artists[0].y).toBeGreaterThan(trackTitles[0].y);
    expect(artists[0].text).toBe("DJ Test");
  });

  it("skips artist items when artist is empty", () => {
    const { items } = calculateLayout(
      buildInput({
        tracks: [{ title: "Instrumental", artist: "" }],
        thumbnailCount: 0,
      })
    );
    expect(items.filter((item) => item.type === "trackArtist")).toHaveLength(0);
  });

  it("includes all tracks even when there are many", () => {
    const manyTracks = Array.from({ length: 30 }, (_, i) => ({
      title: `Track ${i + 1}`,
      artist: `Artist ${i + 1}`,
    }));
    const { items } = calculateLayout(buildInput({ tracks: manyTracks, thumbnailCount: 0 }));
    const trackTitles = items.filter((item) => item.type === "trackTitle");
    expect(trackTitles).toHaveLength(30);
  });

  it("keeps fixed height of 1200 even with many tracks", () => {
    const manyTracks = Array.from({ length: 30 }, (_, i) => ({
      title: `Track ${i + 1}`,
      artist: `Artist ${i + 1}`,
    }));
    const { height } = calculateLayout(buildInput({ tracks: manyTracks, thumbnailCount: 0 }));
    expect(height).toBe(1200);
  });

  it("maintains fixed height of 1200 for few tracks", () => {
    const { height } = calculateLayout(
      buildInput({ tracks: [{ title: "Solo", artist: "" }], thumbnailCount: 0 })
    );
    expect(height).toBe(1200);
  });

  it("uses appropriate font sizes for readability", () => {
    const { items } = calculateLayout(buildInput());
    const title = items.find((item) => item.type === "title")!;
    const trackTitle = items.find((item) => item.type === "trackTitle")!;
    const artist = items.find((item) => item.type === "trackArtist")!;
    expect(title.fontSize!).toBeGreaterThanOrEqual(40);
    expect(trackTitle.fontSize!).toBeGreaterThanOrEqual(20);
    expect(artist.fontSize!).toBeGreaterThanOrEqual(18);
  });

  it("places thumbnails within canvas bounds", () => {
    const { items, width, height } = calculateLayout(buildInput({ thumbnailCount: 3 }));
    const thumbnails = items.filter((item) => item.type === "thumbnail");
    expect(thumbnails.length).toBe(3);
    for (const thumb of thumbnails) {
      expect(thumb.x + thumb.width).toBeLessThanOrEqual(width);
      expect(thumb.y).toBeGreaterThanOrEqual(0);
      expect(thumb.y + thumb.height).toBeLessThanOrEqual(height);
    }
  });

  it("produces no thumbnail items when thumbnailCount is 0", () => {
    const { items } = calculateLayout(buildInput({ thumbnailCount: 0 }));
    expect(items.filter((item) => item.type === "thumbnail")).toHaveLength(0);
  });

  it("does not produce overlapping thumbnails", () => {
    const { items } = calculateLayout(buildInput({ thumbnailCount: 4 }));
    const thumbnails = items.filter((item) => item.type === "thumbnail");
    for (let i = 0; i < thumbnails.length; i++) {
      for (let j = i + 1; j < thumbnails.length; j++) {
        const a = thumbnails[i];
        const b = thumbnails[j];
        const overlaps =
          a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y;
        expect(overlaps, `thumbnails ${i} and ${j} overlap`).toBe(false);
      }
    }
  });
});

describe("renderShareImage", () => {
  const origCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    const { canvas } = createMockCanvas();
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return canvas as unknown as HTMLCanvasElement;
      return origCreateElement(tag);
    });
  });

  it("returns a Blob", async () => {
    const blob = await renderShareImage(buildInput({ thumbnailCount: 0 }), []);
    expect(blob).toBeInstanceOf(Blob);
  });

  it("draws thumbnails from provided images", async () => {
    const img = new Image();
    img.width = 480;
    img.height = 360;
    const blob = await renderShareImage(buildInput({ thumbnailCount: 1 }), [img]);
    expect(blob).toBeInstanceOf(Blob);
  });

  it("skips drawing when thumbnail image is missing", async () => {
    const blob = await renderShareImage(buildInput({ thumbnailCount: 1 }), []);
    expect(blob).toBeInstanceOf(Blob);
  });

  it("renders text items with fallback color and fontWeight", async () => {
    const { canvas, ctx } = createMockCanvas();
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return canvas as unknown as HTMLCanvasElement;
      return origCreateElement(tag);
    });

    const blob = await renderShareImage(
      buildInput({ eventName: null, tracks: [{ title: "Test", artist: "" }] }),
      []
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it("applies color preset background", async () => {
    const { canvas, ctx } = createMockCanvas();
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return canvas as unknown as HTMLCanvasElement;
      return origCreateElement(tag);
    });

    const colors = buildColors({ background: "#ff0000" });
    await renderShareImage(buildInput({ thumbnailCount: 0 }), [], { colors });
    const fillRectCalls = ctx.fillRect.mock.calls;
    expect(fillRectCalls.length).toBeGreaterThan(0);
  });

  it("draws a card background with rounded corners", async () => {
    const { canvas, ctx } = createMockCanvas();
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return canvas as unknown as HTMLCanvasElement;
      return origCreateElement(tag);
    });

    await renderShareImage(buildInput({ thumbnailCount: 0 }), []);
    expect(ctx.quadraticCurveTo.mock.calls.length).toBeGreaterThan(0);
    expect(ctx.fill.mock.calls.length).toBeGreaterThan(0);
  });

  it("draws sparkle motifs when decorations include sparkle", async () => {
    const { canvas, ctx } = createMockCanvas();
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return canvas as unknown as HTMLCanvasElement;
      return origCreateElement(tag);
    });

    await renderShareImage(buildInput({ thumbnailCount: 0 }), [], {
      decorations: ["sparkle"],
    });
    expect(ctx.moveTo.mock.calls.length).toBeGreaterThan(0);
    expect(ctx.lineTo.mock.calls.length).toBeGreaterThan(0);
  });

  it("draws bar motifs when decorations include bars", async () => {
    const { canvas, ctx } = createMockCanvas();
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return canvas as unknown as HTMLCanvasElement;
      return origCreateElement(tag);
    });

    await renderShareImage(buildInput({ thumbnailCount: 0 }), [], {
      decorations: ["bars"],
    });
    expect(ctx.rotate.mock.calls.length).toBeGreaterThan(0);
    expect(ctx.fill.mock.calls.length).toBeGreaterThan(0);
  });

  it("draws dot motifs when decorations include dots", async () => {
    const { canvas, ctx } = createMockCanvas();
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return canvas as unknown as HTMLCanvasElement;
      return origCreateElement(tag);
    });

    await renderShareImage(buildInput({ thumbnailCount: 0 }), [], {
      decorations: ["dots"],
    });
    expect(ctx.arc.mock.calls.length).toBeGreaterThan(0);
  });

  it("draws multiple motifs when multiple decorations are enabled", async () => {
    const { canvas, ctx } = createMockCanvas();
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return canvas as unknown as HTMLCanvasElement;
      return origCreateElement(tag);
    });

    await renderShareImage(buildInput({ thumbnailCount: 0 }), [], {
      decorations: ["sparkle", "bars"],
    });
    expect(ctx.moveTo.mock.calls.length).toBeGreaterThan(0);
    expect(ctx.rotate.mock.calls.length).toBeGreaterThan(0);
  });

  it("does not draw motifs when decorations is empty", async () => {
    const { canvas, ctx } = createMockCanvas();
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return canvas as unknown as HTMLCanvasElement;
      return origCreateElement(tag);
    });

    await renderShareImage(buildInput({ thumbnailCount: 0 }), [], {
      decorations: [],
    });
    expect(ctx.arc.mock.calls.length).toBe(0);
    expect(ctx.rotate.mock.calls.length).toBe(0);
  });

  it("rejects when toBlob returns null", async () => {
    const { canvas } = createMockCanvas();
    canvas.toBlob = vi.fn((cb: (blob: Blob | null) => void) => {
      cb(null);
    });
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return canvas as unknown as HTMLCanvasElement;
      return origCreateElement(tag);
    });

    await expect(renderShareImage(buildInput({ thumbnailCount: 0 }), [])).rejects.toThrow(
      "toBlob failed"
    );
  });
});

describe("downloadBlob", () => {
  it("creates and clicks a download link then revokes the URL", () => {
    const revokeObjectURL = vi.fn();
    const createObjectURL = vi.fn().mockReturnValue("blob:test");
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    const clicked: boolean[] = [];
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === "a") {
        vi.spyOn(el as HTMLAnchorElement, "click").mockImplementation(() => {
          clicked.push(true);
        });
      }
      return el;
    });

    const blob = new Blob(["test"], { type: "image/png" });
    downloadBlob(blob, "share.png");

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicked).toHaveLength(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });
});
