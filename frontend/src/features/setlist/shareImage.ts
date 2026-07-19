import {
  type ColorPreset,
  type DecorationPreset,
  getColorPreset,
  getDecorationPreset,
} from "./theme";

export type ShareImageInput = {
  name: string;
  eventName: string | null;
  tracks: { title: string; artist: string }[];
  thumbnailCount: number;
};

export type ThemeOptions = {
  colors?: ColorPreset;
  decoration?: DecorationPreset;
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
  width: number;
  height: number;
};

const MAX_W = 1200;
const MIN_H = 675;
const PAD = 48;
const THUMB_W = 240;
const THUMB_H = 135;
const THUMB_COL_GAP = 12;
const THUMB_ROW_GAP = 16;
const RIGHT_PAD = 20;
const TEXT_THUMB_GAP = 30;
const THUMB_START_Y = 50;

const CARD_MARGIN = 32;
const CARD_RADIUS = 20;

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

export function calculateLayout(
  input: ShareImageInput,
  slots?: [number, number][],
  colors?: ColorPreset
): LayoutResult {
  const items: LayoutItem[] = [];
  const c = colors ?? getColorPreset("dark");

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

  const thumbCols = input.thumbnailCount >= 2 ? 2 : input.thumbnailCount;
  const thumbAreaWidth =
    thumbCols === 2
      ? 2 * THUMB_W + THUMB_COL_GAP + RIGHT_PAD
      : thumbCols === 1
        ? THUMB_W + RIGHT_PAD
        : 0;

  const maxAllowed =
    thumbCols > 0 ? MAX_W - thumbAreaWidth - TEXT_THUMB_GAP - PAD : MAX_W - 2 * PAD;
  const textAreaWidth = Math.min(Math.max(0, ...textWidths), maxAllowed);

  const canvasWidth =
    thumbCols > 0
      ? PAD + textAreaWidth + TEXT_THUMB_GAP + thumbAreaWidth
      : PAD + textAreaWidth + PAD;

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
    color: c.title,
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
      color: c.event,
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
      color: c.trackTitle,
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
        color: c.trackArtist,
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

  return { items, width: canvasWidth, height };
}

export async function renderShareImage(
  input: ShareImageInput,
  thumbnails: HTMLImageElement[],
  theme?: ThemeOptions
): Promise<Blob> {
  const colors = theme?.colors ?? getColorPreset("dark");
  const decoration = theme?.decoration ?? getDecorationPreset("none");
  const { items: layout, width, height } = calculateLayout(input, undefined, colors);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  drawMotifs(ctx, width, height, decoration);

  drawCard(ctx, width, height, colors.card);

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

  ctx.fillStyle = colors.watermark;
  ctx.font = '14px "Noto Sans JP", sans-serif';
  ctx.textBaseline = "bottom";
  ctx.fillText("setnote", width - PAD - ctx.measureText("setnote").width, height - 16);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png"
    );
  });
}

function drawCard(ctx: CanvasRenderingContext2D, w: number, h: number, cardColor: string) {
  ctx.save();
  ctx.fillStyle = cardColor;
  roundRect(ctx, CARD_MARGIN, CARD_MARGIN, w - 2 * CARD_MARGIN, h - 2 * CARD_MARGIN, CARD_RADIUS);
  ctx.fill();
  ctx.restore();
}

function seededPositions(w: number, h: number, count: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const margin = CARD_MARGIN;
  const edgeThickness = margin * 0.8;

  const perSide = Math.ceil(count / 4);
  for (let i = 0; i < perSide; i++) {
    const t = (i + 0.5) / perSide;
    positions.push({ x: t * w, y: edgeThickness * (i % 3) * 0.3 });
    positions.push({ x: t * w, y: h - edgeThickness * (i % 3) * 0.3 });
    positions.push({ x: edgeThickness * (i % 3) * 0.3, y: t * h });
    positions.push({ x: w - edgeThickness * (i % 3) * 0.3, y: t * h });
  }

  return positions.slice(0, count);
}

function drawMotifs(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  decoration: DecorationPreset
) {
  if (decoration.motif === "none") return;

  ctx.save();
  ctx.fillStyle = decoration.color;
  ctx.strokeStyle = decoration.color;
  ctx.globalAlpha = 0.15;

  const positions = seededPositions(w, h, 20);

  switch (decoration.motif) {
    case "sparkle":
      for (const pos of positions) {
        drawSparkle(ctx, pos.x, pos.y, 8 + (pos.x % 7));
      }
      break;
    case "bars":
      for (const pos of positions) {
        drawBar(ctx, pos.x, pos.y, 20 + (pos.x % 10), 6, pos.y * 0.01);
      }
      break;
    case "dots":
      for (const pos of positions) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3 + (pos.x % 4), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
  }

  ctx.restore();
}

function drawSparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size * 0.2, cy - size * 0.2);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx + size * 0.2, cy + size * 0.2);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size * 0.2, cy + size * 0.2);
  ctx.lineTo(cx - size, cy);
  ctx.lineTo(cx - size * 0.2, cy - size * 0.2);
  ctx.closePath();
  ctx.fill();
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  length: number,
  width: number,
  angle: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  roundRect(ctx, -length / 2, -width / 2, length, width, width / 2);
  ctx.fill();
  ctx.restore();
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
