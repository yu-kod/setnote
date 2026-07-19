import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchSetlist } from "../api";
import { renderShareImage, downloadBlob, type ThemeOptions } from "../shareImage";
import {
  COLOR_PRESETS,
  DECORATION_OPTIONS,
  type ColorPreset,
  type DecorationMotif,
} from "../theme";
import { Button } from "../../../components/ui/button";
import type { Setlist } from "../types";

type Props = { id: string };
type LoadState =
  { status: "loading" } | { status: "not-found" } | { status: "loaded"; setlist: Setlist };

export function SetlistDesigner({ id }: Props) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [colorPreset, setColorPreset] = useState<ColorPreset>(COLOR_PRESETS[0]);
  const [activeMotifs, setActiveMotifs] = useState<DecorationMotif[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    fetchSetlist(id).then(
      (s) => setState(s ? { status: "loaded", setlist: s } : { status: "not-found" }),
      () => setState({ status: "not-found" })
    );
  }, [id]);

  useEffect(() => {
    if (state.status !== "loaded") return;
    let cancelled = false;
    const { setlist } = state;
    const theme: ThemeOptions = { colors: colorPreset, decorations: activeMotifs };
    const run = async () => {
      setGenerating(true);
      try {
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
        if (cancelled) return;
        if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
        const url = URL.createObjectURL(blob);
        prevUrlRef.current = url;
        setPreviewUrl(url);
      } finally {
        if (!cancelled) setGenerating(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [state, colorPreset, activeMotifs]);

  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, []);

  function toggleMotif(motif: DecorationMotif) {
    setActiveMotifs((prev) =>
      prev.includes(motif) ? prev.filter((m) => m !== motif) : [...prev, motif]
    );
  }

  if (state.status === "loading") {
    return (
      <div
        role="status"
        aria-label="読み込み中"
        className="py-12 text-center text-muted-foreground"
      >
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
    const theme: ThemeOptions = { colors: colorPreset, decorations: activeMotifs };
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            to={`/setlists/${id}/edit`}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            &larr; 編集に戻る
          </Link>
        </div>
        <Button onClick={handleDownload} disabled={generating}>
          ダウンロード
        </Button>
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
          <p className="mb-2 text-sm font-medium">装飾（複数選択可）</p>
          <div className="flex flex-wrap gap-2">
            {DECORATION_OPTIONS.map((opt) => (
              <label
                key={opt.motif}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition-colors ${
                  activeMotifs.includes(opt.motif)
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={activeMotifs.includes(opt.motif)}
                  onChange={() => toggleMotif(opt.motif)}
                  className="sr-only"
                  aria-label={opt.label}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border p-2">
        {previewUrl ? (
          <img src={previewUrl} alt="プレビュー" role="img" className="mx-auto max-w-full" />
        ) : (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            {generating ? "生成中..." : "プレビュー"}
          </div>
        )}
      </div>
    </div>
  );
}
