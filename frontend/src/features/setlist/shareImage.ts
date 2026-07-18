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
const TEXT_THUMB_GAP = 30;
const THUMB_START_Y = 50;
const THUMB_AREA_MIN = 2 * THUMB_W + THUMB_COL_GAP + RIGHT_PAD;

function generateSlots(count: number, col1X: number, col2X: number): [number, number][] {
  const rowHeight = THUMB_H + THUMB_ROW_GAP;
  const slots: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    slots.push([col === 0 ? col1X : col2X, THUMB_START_Y + row * rowHeight]);
  }
  return slots;
}

function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) {
    const code = char.codePointAt(0)!;
    width += code > 0x2e80 ? fontSize : fontSize * 0.55;
  }
  return width;
}

export function calculateLayout(input: ShareImageInput, slots?: [number, number][]): LayoutResult {
  const items: LayoutItem[] = [];

  const titleFontSize = 48;
  const eventFontSize = 30;
  const trackTitleSize = 28;
  const trackArtistSize = 20;
  const trackGap = 10;

  const textWidths = [estimateTextWidth(input.name, titleFontSize)];
  if (input.eventName) textWidths.push(estimateTextWidth(input.eventName, eventFontSize));
  for (const track of input.tracks) {
    textWidths.push(estimateTextWidth(track.title, trackTitleSize));
    if (track.artist) textWidths.push(estimateTextWidth(track.artist, trackArtistSize));
  }

  const maxAllowed = W - THUMB_AREA_MIN - TEXT_THUMB_GAP - PAD;
  const textAreaWidth = Math.min(Math.max(0, ...textWidths), maxAllowed);
  const col1X = PAD + textAreaWidth + TEXT_THUMB_GAP;
  const col2X = col1X + THUMB_W + THUMB_COL_GAP;

  items.push({
    type: "title",
    x: PAD,
    y: 50,
    width: textAreaWidth,
    height: 52,
    text: input.name,
    fontSize: titleFontSize,
    fontWeight: "bold",
    color: "#f5f5f5",
  });

  let trackStartY = 115;

  if (input.eventName) {
    items.push({
      type: "event",
      x: PAD,
      y: 105,
      width: textAreaWidth,
      height: 34,
      text: input.eventName,
      fontSize: eventFontSize,
      fontWeight: "normal",
      color: "#a3a3a3",
    });
    trackStartY = 150;
  }

  let y = trackStartY;
  for (const track of input.tracks) {
    items.push({
      type: "trackTitle",
      x: PAD,
      y,
      width: textAreaWidth,
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
        width: textAreaWidth,
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

  const activeSlots = slots ?? generateSlots(input.thumbnailCount, col1X, col2X);
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
