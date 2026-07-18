export type ShareImageInput = {
  name: string;
  eventName: string | null;
  tracks: { title: string; artist: string }[];
  thumbnailCount: number;
};

export type LayoutItem = {
  type: "title" | "event" | "trackTitle" | "trackArtist" | "thumbnail";
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  imageIndex?: number;
};

export type LayoutResult = {
  items: LayoutItem[];
  height: number;
};

const W = 1200;
const MIN_H = 675;
const PAD = 40;
const THUMB_W = 192;
const THUMB_H = 108;
const THUMB_GAP = 42;

const COL1_X_OFFSETS = [0, 50, -10, 40, -20, 30, 10, -5];
const COL2_X_OFFSETS = [0, 40, -20, 30, 10, -10, 50, 20];
const Y_OFFSETS = [0, 20, 0, -10, 5, 15, -5, 10];

function generateSlots(count: number): [number, number][] {
  const slots: [number, number][] = [];
  const col1Base = 530;
  const col2Base = 790;
  const rowHeight = THUMB_H + THUMB_GAP;

  for (let i = 0; i < count; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const baseX = col === 0 ? col1Base : col2Base;
    const idx = i % 8;
    const xOffset = col === 0 ? COL1_X_OFFSETS[idx] : COL2_X_OFFSETS[idx];
    const yOffset = Y_OFFSETS[idx];
    slots.push([baseX + xOffset, 15 + row * rowHeight + yOffset]);
  }
  return slots;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function calculateLayout(input: ShareImageInput, slots?: [number, number][]): LayoutResult {
  const items: LayoutItem[] = [];

  items.push({
    type: "title",
    x: PAD,
    y: 50,
    width: 500,
    height: 40,
    text: input.name,
    fontSize: 36,
    fontWeight: "bold",
    color: "#f5f5f5",
  });

  let trackStartY = 110;

  if (input.eventName) {
    items.push({
      type: "event",
      x: PAD,
      y: 90,
      width: 500,
      height: 30,
      text: input.eventName,
      fontSize: 22,
      fontWeight: "normal",
      color: "#a3a3a3",
    });
    trackStartY = 140;
  }

  const trackTitleSize = 18;
  const trackArtistSize = 14;
  const trackGap = 8;

  let y = trackStartY;
  for (const track of input.tracks) {
    items.push({
      type: "trackTitle",
      x: PAD,
      y,
      width: 480,
      height: trackTitleSize + 4,
      text: track.title,
      fontSize: trackTitleSize,
      fontWeight: "600",
      color: "#e5e5e5",
    });
    y += trackTitleSize + 4;

    if (track.artist) {
      items.push({
        type: "trackArtist",
        x: PAD,
        y,
        width: 480,
        height: trackArtistSize + 2,
        text: track.artist,
        fontSize: trackArtistSize,
        fontWeight: "normal",
        color: "#737373",
      });
      y += trackArtistSize + 2;
    }

    y += trackGap;
  }

  const trackBottom = y;

  const activeSlots = slots ?? generateSlots(input.thumbnailCount);
  const count = Math.min(input.thumbnailCount, activeSlots.length);
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  let thumbBottom = 0;

  for (let i = 0; i < count; i++) {
    const [baseX, baseY] = activeSlots[i];
    const x = clamp(baseX, 500, W - THUMB_W - 10);
    const thumbY = Math.max(baseY, 10);

    const overlaps = placed.some(
      (p) => x < p.x + p.w && x + THUMB_W > p.x && thumbY < p.y + p.h && thumbY + THUMB_H > p.y
    );

    if (!overlaps) {
      items.push({
        type: "thumbnail",
        x,
        y: thumbY,
        width: THUMB_W,
        height: THUMB_H,
        imageIndex: i,
      });
      placed.push({ x, y: thumbY, w: THUMB_W, h: THUMB_H });
      thumbBottom = Math.max(thumbBottom, thumbY + THUMB_H);
    }
  }

  const contentBottom = Math.max(trackBottom, thumbBottom);
  const height = Math.max(MIN_H, contentBottom + PAD);

  return { items, height };
}

export async function renderShareImage(
  input: ShareImageInput,
  thumbnails: HTMLImageElement[]
): Promise<Blob> {
  const { items: layout, height } = calculateLayout(input);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, W, height);

  for (const item of layout) {
    if (item.type === "thumbnail") {
      const img = thumbnails[item.imageIndex!];
      if (img) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        roundRect(ctx, item.x, item.y, item.width, item.height, 8);
        ctx.clip();
        ctx.drawImage(img, item.x, item.y, item.width, item.height);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = item.color!;
      ctx.font = `${item.fontWeight} ${item.fontSize}px "Noto Sans JP", sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillText(item.text!, item.x, item.y, item.width);
    }
  }

  ctx.fillStyle = "#525252";
  ctx.font = '14px "Noto Sans JP", sans-serif';
  ctx.textBaseline = "bottom";
  ctx.fillText("setnote", W - PAD - ctx.measureText("setnote").width, height - 16);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png"
    );
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
