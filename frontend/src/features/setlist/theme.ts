export type ColorPreset = {
  id: string;
  label: string;
  background: string;
  card: string;
  title: string;
  event: string;
  trackTitle: string;
  trackArtist: string;
  watermark: string;
  decorationColor: string;
};

export type DecorationMotif = "none" | "sparkle" | "bars" | "dots";

export type DecorationPreset = {
  id: string;
  label: string;
  motif: DecorationMotif;
};

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: "dark",
    label: "ダーク",
    background: "#1a1a1a",
    card: "#262626",
    title: "#f5f5f5",
    event: "#a3a3a3",
    trackTitle: "#e5e5e5",
    trackArtist: "#737373",
    watermark: "#525252",
    decorationColor: "#ffffff",
  },
  {
    id: "midnight",
    label: "ミッドナイト",
    background: "#0f172a",
    card: "#1e293b",
    title: "#e2e8f0",
    event: "#94a3b8",
    trackTitle: "#cbd5e1",
    trackArtist: "#64748b",
    watermark: "#475569",
    decorationColor: "#94a3b8",
  },
  {
    id: "forest",
    label: "フォレスト",
    background: "#c6dbbe",
    card: "#ffffff",
    title: "#1a4d2e",
    event: "#3d7a4f",
    trackTitle: "#1a4d2e",
    trackArtist: "#4a7c59",
    watermark: "#a3c4a3",
    decorationColor: "#2d6a3f",
  },
  {
    id: "sunset",
    label: "サンセット",
    background: "#fde8d0",
    card: "#ffffff",
    title: "#7c2d12",
    event: "#c2410c",
    trackTitle: "#7c2d12",
    trackArtist: "#b45309",
    watermark: "#e8c4a0",
    decorationColor: "#ea580c",
  },
  {
    id: "light",
    label: "ライト",
    background: "#e5e7eb",
    card: "#ffffff",
    title: "#171717",
    event: "#525252",
    trackTitle: "#262626",
    trackArtist: "#737373",
    watermark: "#d4d4d4",
    decorationColor: "#000000",
  },
  {
    id: "sakura",
    label: "サクラ",
    background: "#fce4ec",
    card: "#ffffff",
    title: "#880e4f",
    event: "#c2185b",
    trackTitle: "#880e4f",
    trackArtist: "#ad1457",
    watermark: "#f8bbd0",
    decorationColor: "#e91e63",
  },
  {
    id: "ocean",
    label: "オーシャン",
    background: "#e0f2f1",
    card: "#ffffff",
    title: "#004d40",
    event: "#00796b",
    trackTitle: "#004d40",
    trackArtist: "#00897b",
    watermark: "#b2dfdb",
    decorationColor: "#009688",
  },
];

export const DECORATION_PRESETS: DecorationPreset[] = [
  { id: "none", label: "なし", motif: "none" },
  { id: "sparkle", label: "キラキラ", motif: "sparkle" },
  { id: "bars", label: "バー", motif: "bars" },
  { id: "dots-scatter", label: "ドット", motif: "dots" },
];

export function getColorPreset(id: string): ColorPreset {
  return COLOR_PRESETS.find((p) => p.id === id) ?? COLOR_PRESETS[0];
}

export function getDecorationPreset(id: string): DecorationPreset {
  return DECORATION_PRESETS.find((p) => p.id === id) ?? DECORATION_PRESETS[0];
}
