import { type ColorPreset, type DecorationMotif, getColorPreset } from "./theme";

export type ShareImageInput = {
  name: string;
  eventName: string | null;
  tracks: { title: string; artist: string }[];
  thumbnailCount: number;
};

export type ThemeOptions = {
  colors?: ColorPreset;
  decorations?: DecorationMotif[];
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

const CANVAS_W = 900;
const CANVAS_H = 1200;
const PAD = 90;
const THUMB_W = 200;
const THUMB_H = 112;
const THUMB_COL_GAP = 12;
const THUMB_ROW_GAP = 16;

const CARD_MARGIN = 60;
const CARD_RADIUS = 24;


export function calculateLayout(
  input: ShareImageInput,
  _slots?: [number, number][],
  colors?: ColorPreset
): LayoutResult {
  const items: LayoutItem[] = [];
  const c = colors ?? getColorPreset("dark");

  const titleFontSize = 48;
  const eventFontSize = 30;
  const trackTitleSize = 28;
  const trackArtistSize = 20;

  const trackGap = 10;

  const textAreaWidth = CANVAS_W - 2 * PAD;

  items.push({
    type: "title",
    x: PAD,
    y: 80,
    width: textAreaWidth,
    height: 52,
    text: input.name,
    fontSize: titleFontSize,
    fontWeight: "bold",
    color: c.title,
  });

  let trackStartY = 150;

  if (input.eventName) {
    items.push({
      type: "event",
      x: PAD,
      y: 135,
      width: textAreaWidth,
      height: 34,
      text: input.eventName,
      fontSize: eventFontSize,
      fontWeight: "normal",
      color: c.event,
    });
    trackStartY = 185;
  }

  let y = trackStartY;
  for (let idx = 0; idx < input.tracks.length; idx++) {
    const track = input.tracks[idx];

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

  const thumbStartY = trackBottom + 30;
  const thumbCols = Math.max(1, Math.min(input.thumbnailCount, 3));
  const totalThumbW = thumbCols * THUMB_W + (thumbCols - 1) * THUMB_COL_GAP;
  const thumbStartX = (CANVAS_W - totalThumbW) / 2;

  for (let i = 0; i < input.thumbnailCount; i++) {
    const colIdx = i % thumbCols;
    const row = Math.floor(i / thumbCols);
    items.push({
      type: "thumbnail",
      x: thumbStartX + colIdx * (THUMB_W + THUMB_COL_GAP),
      y: thumbStartY + row * (THUMB_H + THUMB_ROW_GAP),
      width: THUMB_W,
      height: THUMB_H,
      imageIndex: i,
    });
  }

  return { items, width: CANVAS_W, height: CANVAS_H };
}

export async function renderShareImage(
  input: ShareImageInput,
  thumbnails: HTMLImageElement[],
  theme?: ThemeOptions
): Promise<Blob> {
  const colors = theme?.colors ?? getColorPreset("dark");
  const decorations = theme?.decorations ?? [];
  const { items: layout, width, height } = calculateLayout(input, undefined, colors);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  drawAllMotifs(ctx, width, height, decorations, colors.decorationColor);

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

function seededPositions(
  w: number,
  h: number,
  count: number,
  seed: number
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const band = CARD_MARGIN + 10;

  const perSide = Math.ceil(count / 4);
  for (let i = 0; i < perSide; i++) {
    const t = (i + 0.5) / perSide;
    const offset = 4 + (((i + seed) * 17 + 7) % (band - 4));
    positions.push({ x: t * w, y: offset });
    positions.push({ x: t * w, y: h - offset });
    positions.push({ x: offset, y: t * h });
    positions.push({ x: w - offset, y: t * h });
  }

  return positions.slice(0, count);
}

function drawAllMotifs(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  motifs: DecorationMotif[],
  decorationColor: string
) {
  for (let mi = 0; mi < motifs.length; mi++) {
    drawMotif(ctx, w, h, motifs[mi], decorationColor, mi * 37);
  }
}

function drawMotif(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  motif: DecorationMotif,
  decorationColor: string,
  seed: number
) {
  ctx.save();
  ctx.fillStyle = decorationColor;
  ctx.strokeStyle = decorationColor;
  ctx.globalAlpha = 0.65;

  const positions = seededPositions(w, h, 24, seed);

  switch (motif) {
    case "sparkle":
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        const size = 20 + (((i + seed) * 7 + 3) % 30);
        drawSparkle(ctx, pos.x, pos.y, size);
      }
      break;
    case "bars":
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        const len = 35 + (((i + seed) * 11 + 5) % 30);
        const bw = 8 + (((i + seed) * 3 + 1) % 4);
        const angle = (((i + seed) * 37 + 13) % 60) * 0.05;
        drawBar(ctx, pos.x, pos.y, len, bw, angle);
      }
      break;
    case "dots":
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        const r = 6 + (((i + seed) * 5 + 2) % 10);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
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
