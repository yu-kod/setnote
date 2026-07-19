export type ColorPreset = {
  id: string;
  label: string;
  background: string;
  title: string;
  event: string;
  trackTitle: string;
  trackArtist: string;
  watermark: string;
};

export type DecorationPattern = "none" | "dots" | "grid" | "diagonal" | "border";

export type DecorationPreset = {
  id: string;
  label: string;
  pattern: DecorationPattern;
  color: string;
};

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: "dark",
    label: "ダーク",
    background: "#1a1a1a",
    title: "#f5f5f5",
    event: "#a3a3a3",
    trackTitle: "#e5e5e5",
    trackArtist: "#737373",
    watermark: "#525252",
  },
  {
    id: "midnight",
    label: "ミッドナイト",
    background: "#0f172a",
    title: "#e2e8f0",
    event: "#94a3b8",
    trackTitle: "#cbd5e1",
    trackArtist: "#64748b",
    watermark: "#475569",
  },
  {
    id: "forest",
    label: "フォレスト",
    background: "#052e16",
    title: "#dcfce7",
    event: "#86efac",
    trackTitle: "#bbf7d0",
    trackArtist: "#4ade80",
    watermark: "#166534",
  },
  {
    id: "sunset",
    label: "サンセット",
    background: "#1c1917",
    title: "#fef3c7",
    event: "#fbbf24",
    trackTitle: "#fde68a",
    trackArtist: "#d97706",
    watermark: "#78350f",
  },
  {
    id: "light",
    label: "ライト",
    background: "#ffffff",
    title: "#171717",
    event: "#525252",
    trackTitle: "#262626",
    trackArtist: "#737373",
    watermark: "#d4d4d4",
  },
];

export const DECORATION_PRESETS: DecorationPreset[] = [
  { id: "none", label: "なし", pattern: "none", color: "#ffffff" },
  { id: "dots-subtle", label: "ドット", pattern: "dots", color: "#ffffff" },
  { id: "grid-subtle", label: "グリッド", pattern: "grid", color: "#ffffff" },
  { id: "diagonal-subtle", label: "斜線", pattern: "diagonal", color: "#ffffff" },
  { id: "border-simple", label: "枠線", pattern: "border", color: "#ffffff" },
];

export function getColorPreset(id: string): ColorPreset {
  return COLOR_PRESETS.find((p) => p.id === id) ?? COLOR_PRESETS[0];
}

export function getDecorationPreset(id: string): DecorationPreset {
  return DECORATION_PRESETS.find((p) => p.id === id) ?? DECORATION_PRESETS[0];
}
