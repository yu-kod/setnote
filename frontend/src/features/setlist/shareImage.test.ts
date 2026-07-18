import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateLayout, renderShareImage, downloadBlob, type ShareImageInput } from "./shareImage";

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
  it("places the setlist name at the top", () => {
    const layout = calculateLayout(buildInput());
    const title = layout.find((item) => item.type === "title");
    expect(title).toBeDefined();
    expect(title!.text).toBe("Summer Vibes");
    expect(title!.y).toBeLessThan(100);
  });

  it("places the event name below the title", () => {
    const layout = calculateLayout(buildInput());
    const title = layout.find((item) => item.type === "title")!;
    const event = layout.find((item) => item.type === "event")!;
    expect(event.text).toBe("Summer Festival 2026");
    expect(event.y).toBeGreaterThan(title.y);
  });

  it("omits the event item when eventName is null", () => {
    const layout = calculateLayout(buildInput({ eventName: null }));
    expect(layout.find((item) => item.type === "event")).toBeUndefined();
  });

  it("places tracks below the header", () => {
    const layout = calculateLayout(buildInput());
    const header = layout.filter((item) => item.type === "title" || item.type === "event");
    const tracks = layout.filter((item) => item.type === "trackTitle");
    const lowestHeader = Math.max(...header.map((h) => h.y));
    expect(tracks.length).toBe(2);
    expect(tracks[0].y).toBeGreaterThan(lowestHeader);
    expect(tracks[0].text).toBe("Opening");
  });

  it("places artist names below their track titles with a smaller font", () => {
    const layout = calculateLayout(buildInput());
    const trackTitles = layout.filter((item) => item.type === "trackTitle");
    const artists = layout.filter((item) => item.type === "trackArtist");
    expect(artists.length).toBe(2);
    expect(artists[0].y).toBeGreaterThan(trackTitles[0].y);
    expect(artists[0].fontSize!).toBeLessThan(trackTitles[0].fontSize!);
    expect(artists[0].text).toBe("DJ Test");
  });

  it("skips artist items when artist is empty", () => {
    const layout = calculateLayout(
      buildInput({
        tracks: [{ title: "Instrumental", artist: "" }],
        thumbnailCount: 0,
      })
    );
    expect(layout.filter((item) => item.type === "trackArtist")).toHaveLength(0);
  });

  it("places thumbnails in the right region", () => {
    const layout = calculateLayout(buildInput({ thumbnailCount: 3 }));
    const thumbnails = layout.filter((item) => item.type === "thumbnail");
    expect(thumbnails.length).toBe(3);
    for (const thumb of thumbnails) {
      expect(thumb.x).toBeGreaterThanOrEqual(500);
      expect(thumb.x + thumb.width).toBeLessThanOrEqual(1200);
      expect(thumb.y).toBeGreaterThanOrEqual(0);
      expect(thumb.y + thumb.height).toBeLessThanOrEqual(675);
    }
  });

  it("produces no thumbnail items when thumbnailCount is 0", () => {
    const layout = calculateLayout(buildInput({ thumbnailCount: 0 }));
    expect(layout.filter((item) => item.type === "thumbnail")).toHaveLength(0);
  });

  it("does not produce overlapping thumbnails", () => {
    const layout = calculateLayout(buildInput({ thumbnailCount: 4 }));
    const thumbnails = layout.filter((item) => item.type === "thumbnail");
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

  it("caps thumbnails at the number of available slots", () => {
    const layout = calculateLayout(buildInput({ thumbnailCount: 100 }));
    const thumbnails = layout.filter((item) => item.type === "thumbnail");
    expect(thumbnails.length).toBeLessThanOrEqual(8);
    expect(thumbnails.length).toBeGreaterThan(0);
  });

  it("skips thumbnails that would overlap with already placed ones", () => {
    const overlappingSlots: [number, number][] = [
      [530, 100],
      [530, 100],
    ];
    const layout = calculateLayout(buildInput({ thumbnailCount: 2 }), overlappingSlots);
    const thumbnails = layout.filter((item) => item.type === "thumbnail");
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
