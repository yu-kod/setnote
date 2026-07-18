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
const PAD = 48;
const THUMB_W = 240;
const THUMB_H = 135;
const THUMB_COL_GAP = 12;
const THUMB_ROW_GAP = 16;
const RIGHT_PAD = 20;
const COL2_X = W - RIGHT_PAD - THUMB_W;
const COL1_X = COL2_X - THUMB_COL_GAP - THUMB_W;
const THUMB_START_Y = 50;

function generateSlots(count: number): [number, number][] {
  const rowHeight = THUMB_H + THUMB_ROW_GAP;
  const slots: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    slots.push([col === 0 ? COL1_X : COL2_X, THUMB_START_Y + row * rowHeight]);
  }
  return slots;
}

export function calculateLayout(input: ShareImageInput, slots?: [number, number][]): LayoutResult {
  const items: LayoutItem[] = [];

  const textWidth = COL1_X - PAD - 40;

  items.push({
    type: "title",
    x: PAD,
    y: 50,
    width: textWidth,
    height: 48,
    text: input.name,
    fontSize: 42,
    fontWeight: "bold",
    color: "#f5f5f5",
  });

  let trackStartY = 110;

  if (input.eventName) {
    items.push({
      type: "event",
      x: PAD,
      y: 100,
      width: textWidth,
      height: 32,
      text: input.eventName,
      fontSize: 26,
      fontWeight: "normal",
      color: "#a3a3a3",
    });
    trackStartY = 145;
  }

  const trackTitleSize = 22;
  const trackArtistSize = 16;
  const trackGap = 10;

  let y = trackStartY;
  for (const track of input.tracks) {
    items.push({
      type: "trackTitle",
      x: PAD,
      y,
      width: textWidth,
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
        width: textWidth,
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
    const [x, thumbY] = activeSlots[i];

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
