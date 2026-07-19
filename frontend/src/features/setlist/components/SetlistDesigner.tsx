import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchSetlist } from "../api";
import { renderShareImage, downloadBlob, type ThemeOptions } from "../shareImage";
import { COLOR_PRESETS, DECORATION_PRESETS, type ColorPreset, type DecorationPreset } from "../theme";
import { Button } from "../../../components/ui/button";
import type { Setlist } from "../types";

type Props = { id: string };
type LoadState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "loaded"; setlist: Setlist };

export function SetlistDesigner({ id }: Props) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [colorPreset, setColorPreset] = useState<ColorPreset>(COLOR_PRESETS[0]);
  const [decorationPreset, setDecorationPreset] = useState<DecorationPreset>(DECORATION_PRESETS[0]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    fetchSetlist(id).then(
      (s) => setState(s ? { status: "loaded", setlist: s } : { status: "not-found" }),
      () => setState({ status: "not-found" })
    );
  }, [id]);

  const generatePreview = useCallback(
    async (setlist: Setlist, colors: ColorPreset, decoration: DecorationPreset) => {
      setGenerating(true);
      try {
        const theme: ThemeOptions = { colors, decoration };
        const blob = await renderShareImage(
          {
            name: setlist.name,
            eventName: setlist.eventName,
            tracks: setlist.tracks.map((t) => ({ title: t.title, artist: t.artist })),
            thumbnailCount: 0,
          },
          [],
          theme
        );
        if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
        const url = URL.createObjectURL(blob);
        prevUrlRef.current = url;
        setPreviewUrl(url);
      } finally {
        setGenerating(false);
      }
    },
    []
  );

  useEffect(() => {
    if (state.status === "loaded") {
      generatePreview(state.setlist, colorPreset, decorationPreset);
    }
  }, [state, colorPreset, decorationPreset, generatePreview]);

  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div role="status" aria-label="読み込み中" className="py-12 text-center text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (state.status === "not-found") {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">お探しのページが見つかりませんでした</p>
      </div>
    );
  }

  const { setlist } = state;

  async function handleDownload() {
    const theme: ThemeOptions = { colors: colorPreset, decoration: decorationPreset };
    const blob = await renderShareImage(
      {
        name: setlist.name,
        eventName: setlist.eventName,
        tracks: setlist.tracks.map((t) => ({ title: t.title, artist: t.artist })),
        thumbnailCount: 0,
      },
      [],
      theme
    );
    const slug = setlist.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");
    downloadBlob(blob, `${slug || "setlist"}-share.png`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          to={`/setlists/${id}/edit`}
          className="text-sm text-muted-foreground hover:text-primary"
        >
          &larr; 編集に戻る
        </Link>
      </div>

      <h2 className="text-xl font-bold">シェア画像デザイン</h2>

      <div className="space-y-4">
        <fieldset>
          <legend className="sr-only">カラー</legend>
          <p className="mb-2 text-sm font-medium">カラー</p>
          <div role="radiogroup" aria-label="カラー" className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((preset) => (
              <label
                key={preset.id}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  colorPreset.id === preset.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <input
                  type="radio"
                  name="color-preset"
                  value={preset.id}
                  checked={colorPreset.id === preset.id}
                  onChange={() => setColorPreset(preset)}
                  className="sr-only"
                  aria-label={preset.label}
                />
                <span
                  className="inline-block h-5 w-5 rounded-full border border-border"
                  style={{ backgroundColor: preset.background }}
                />
                <span>{preset.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="sr-only">装飾</legend>
          <p className="mb-2 text-sm font-medium">装飾</p>
          <div role="radiogroup" aria-label="装飾" className="flex flex-wrap gap-2">
            {DECORATION_PRESETS.map((preset) => (
              <label
                key={preset.id}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition-colors ${
                  decorationPreset.id === preset.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <input
                  type="radio"
                  name="decoration-preset"
                  value={preset.id}
                  checked={decorationPreset.id === preset.id}
                  onChange={() => setDecorationPreset(preset)}
                  className="sr-only"
                  aria-label={preset.label}
                />
                <span>{preset.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border p-2">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="プレビュー"
            role="img"
            className="mx-auto max-w-full"
          />
        ) : (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            {generating ? "生成中..." : "プレビュー"}
          </div>
        )}
      </div>

      <Button onClick={handleDownload} disabled={generating}>
        ダウンロード
      </Button>
    </div>
  );
}
