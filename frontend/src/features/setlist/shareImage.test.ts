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

function createMockCanvas() {
  const ctx = {
    fillStyle: "",
    font: "",
    textBaseline: "",
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
  it("returns items, width, and height", () => {
    const result: LayoutResult = calculateLayout(buildInput());
    expect(result.items).toBeInstanceOf(Array);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThanOrEqual(675);
  });

  it("adjusts canvas width to fit content", () => {
    const short = calculateLayout(
      buildInput({ name: "A", tracks: [{ title: "B", artist: "" }], thumbnailCount: 2 })
    );
    expect(short.width).toBeLessThan(1200);
  });

  it("adjusts width for a single thumbnail column", () => {
    const result = calculateLayout(
      buildInput({ name: "A", tracks: [{ title: "B", artist: "" }], thumbnailCount: 1 })
    );
    const twoCol = calculateLayout(
      buildInput({ name: "A", tracks: [{ title: "B", artist: "" }], thumbnailCount: 2 })
    );
    expect(result.width).toBeLessThan(twoCol.width);
  });

  it("uses narrower width when there are no thumbnails", () => {
    const noThumbs = calculateLayout(
      buildInput({ name: "Short", tracks: [{ title: "Track", artist: "" }], thumbnailCount: 0 })
    );
    const withThumbs = calculateLayout(
      buildInput({ name: "Short", tracks: [{ title: "Track", artist: "" }], thumbnailCount: 2 })
    );
    expect(noThumbs.width).toBeLessThan(withThumbs.width);
  });

  it("caps canvas width at 1200", () => {
    const veryLong = "あ".repeat(100);
    const { width } = calculateLayout(buildInput({ name: veryLong, thumbnailCount: 2 }));
    expect(width).toBeLessThanOrEqual(1200);
  });

  it("applies color preset to layout items", () => {
    const colors: ColorPreset = {
      id: "test",
      label: "Test",
      background: "#000000",
      title: "#ff0000",
      event: "#00ff00",
      trackTitle: "#0000ff",
      trackArtist: "#ffff00",
      watermark: "#cccccc",
    };
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

  it("places artist names below their track titles with a smaller font", () => {
    const { items } = calculateLayout(buildInput());
    const trackTitles = items.filter((item) => item.type === "trackTitle");
    const artists = items.filter((item) => item.type === "trackArtist");
    expect(artists.length).toBe(2);
    expect(artists[0].y).toBeGreaterThan(trackTitles[0].y);
    expect(artists[0].fontSize!).toBeLessThan(trackTitles[0].fontSize!);
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

  it("expands height to fit all tracks", () => {
    const manyTracks = Array.from({ length: 30 }, (_, i) => ({
      title: `Track ${i + 1}`,
      artist: `Artist ${i + 1}`,
    }));
    const { height } = calculateLayout(buildInput({ tracks: manyTracks, thumbnailCount: 0 }));
    expect(height).toBeGreaterThan(675);
  });

  it("maintains minimum height of 675 for few tracks", () => {
    const { height } = calculateLayout(
      buildInput({ tracks: [{ title: "Solo", artist: "" }], thumbnailCount: 0 })
    );
    expect(height).toBe(675);
  });

  it("uses larger font sizes for readability", () => {
    const { items } = calculateLayout(buildInput());
    const title = items.find((item) => item.type === "title")!;
    const trackTitle = items.find((item) => item.type === "trackTitle")!;
    const artist = items.find((item) => item.type === "trackArtist")!;
    expect(title.fontSize!).toBeGreaterThanOrEqual(46);
    expect(trackTitle.fontSize!).toBeGreaterThanOrEqual(26);
    expect(artist.fontSize!).toBeGreaterThanOrEqual(18);
  });

  it("positions thumbnails right after the longest text", () => {
    const short = calculateLayout(
      buildInput({ name: "A", tracks: [{ title: "B", artist: "" }], thumbnailCount: 2 })
    );
    const long = calculateLayout(
      buildInput({
        name: "吉原ラメント(あんたれすP Remix)",
        tracks: [{ title: "アニマリズムと25人の子供たち", artist: "" }],
        thumbnailCount: 2,
      })
    );
    const shortThumb = short.items.find((i) => i.type === "thumbnail")!;
    const longThumb = long.items.find((i) => i.type === "thumbnail")!;
    expect(longThumb.x).toBeGreaterThan(shortThumb.x);
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

  it("aligns thumbnails in a clean grid without jitter", () => {
    const { items } = calculateLayout(buildInput({ thumbnailCount: 6 }));
    const thumbnails = items.filter((item) => item.type === "thumbnail");
    const col1Thumbs = thumbnails.filter((_, i) => i % 2 === 0);
    const col2Thumbs = thumbnails.filter((_, i) => i % 2 === 1);
    const col1Xs = new Set(col1Thumbs.map((t) => t.x));
    const col2Xs = new Set(col2Thumbs.map((t) => t.x));
    expect(col1Xs.size).toBe(1);
    expect(col2Xs.size).toBe(1);
  });

  it("caps text area width so thumbnails always fit", () => {
    const veryLong = "あ".repeat(100);
    const { items, width } = calculateLayout(
      buildInput({ name: veryLong, tracks: [], thumbnailCount: 2 })
    );
    const thumbnails = items.filter((i) => i.type === "thumbnail");
    expect(thumbnails).toHaveLength(2);
    for (const thumb of thumbnails) {
      expect(thumb.x + thumb.width).toBeLessThanOrEqual(width);
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

  it("places all thumbnails without a fixed slot cap", () => {
    const { items } = calculateLayout(buildInput({ thumbnailCount: 12 }));
    const thumbnails = items.filter((item) => item.type === "thumbnail");
    expect(thumbnails).toHaveLength(12);
  });

  it("expands height to fit many thumbnails", () => {
    const { height } = calculateLayout(buildInput({ thumbnailCount: 12 }));
    expect(height).toBeGreaterThan(675);
  });

  it("skips thumbnails that would overlap with already placed ones", () => {
    const overlappingSlots: [number, number][] = [
      [530, 100],
      [530, 100],
    ];
    const { items } = calculateLayout(buildInput({ thumbnailCount: 2 }), overlappingSlots);
    const thumbnails = items.filter((item) => item.type === "thumbnail");
    expect(thumbnails).toHaveLength(1);
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
    const origCreateElement = document.createElement.bind(document);
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
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return canvas as unknown as HTMLCanvasElement;
      return origCreateElement(tag);
    });

    const colors: ColorPreset = {
      id: "test",
      label: "Test",
      background: "#ff0000",
      title: "#ffffff",
      event: "#cccccc",
      trackTitle: "#eeeeee",
      trackArtist: "#aaaaaa",
      watermark: "#888888",
    };
    await renderShareImage(buildInput({ thumbnailCount: 0 }), [], { colors });
    const fillRectCalls = ctx.fillRect.mock.calls;
    expect(fillRectCalls.length).toBeGreaterThan(0);
  });

  it("draws dots decoration pattern", async () => {
    const { canvas, ctx } = createMockCanvas();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return canvas as unknown as HTMLCanvasElement;
      return origCreateElement(tag);
    });

    await renderShareImage(buildInput({ thumbnailCount: 0 }), [], {
      decoration: { id: "d", label: "D", pattern: "dots", color: "#fff" },
    });
    expect(ctx.arc.mock.calls.length).toBeGreaterThan(0);
  });

  it("draws grid decoration pattern", async () => {
    const { canvas, ctx } = createMockCanvas();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return canvas as unknown as HTMLCanvasElement;
      return origCreateElement(tag);
    });

    await renderShareImage(buildInput({ thumbnailCount: 0 }), [], {
      decoration: { id: "g", label: "G", pattern: "grid", color: "#fff" },
    });
    expect(ctx.stroke.mock.calls.length).toBeGreaterThan(0);
  });

  it("draws diagonal decoration pattern", async () => {
    const { canvas, ctx } = createMockCanvas();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return canvas as unknown as HTMLCanvasElement;
      return origCreateElement(tag);
    });

    await renderShareImage(buildInput({ thumbnailCount: 0 }), [], {
      decoration: { id: "dg", label: "DG", pattern: "diagonal", color: "#fff" },
    });
    expect(ctx.stroke.mock.calls.length).toBeGreaterThan(0);
  });

  it("draws border decoration pattern", async () => {
    const { canvas, ctx } = createMockCanvas();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return canvas as unknown as HTMLCanvasElement;
      return origCreateElement(tag);
    });

    await renderShareImage(buildInput({ thumbnailCount: 0 }), [], {
      decoration: { id: "b", label: "B", pattern: "border", color: "#fff" },
    });
    expect(ctx.stroke.mock.calls.length).toBeGreaterThan(0);
  });

  it("rejects when toBlob returns null", async () => {
    const { canvas } = createMockCanvas();
    canvas.toBlob = vi.fn((cb: (blob: Blob | null) => void) => {
      cb(null);
    });
    const origCreateElement = document.createElement.bind(document);
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
