import { useRef, useState } from "react";
import { toast } from "sonner";
import { parseImageTracks, type ParsedTrack } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImagePlus } from "lucide-react";

const VALID_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_SIZE = 5 * 1024 * 1024;

type ImageTrackImportProps = {
  onImport: (tracks: ParsedTrack[]) => void;
};

export function ImageTrackImport({ onImport }: ImageTrackImportProps) {
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function close() {
    setOpen(false);
    setParsing(false);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!VALID_TYPES.has(file.type)) {
      toast.error("PNG, JPEG, WebP, GIF のみ対応しています");
      return;
    }

    if (file.size > MAX_SIZE) {
      toast.error("画像は5MB以下にしてください");
      return;
    }

    setParsing(true);

    try {
      const base64 = await fileToBase64(file);
      const tracks = await parseImageTracks(base64, file.type);

      if (tracks.length === 0) {
        toast.error("トラックを読み取れませんでした");
        return;
      }

      onImport(tracks);
      toast.success(`${tracks.length}曲を読み取りました`);
      close();
    } catch {
      toast.error("画像の解析に失敗しました");
    } finally {
      setParsing(false);
      /* v8 ignore start -- ref is always attached while the form is open */
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      /* v8 ignore stop */
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <ImagePlus className="mr-2 h-4 w-4" />
        画像から追加
      </Button>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div>
        <Label htmlFor="image-track-import">プレイリスト画像</Label>
        <Input
          ref={inputRef}
          id="image-track-import"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFileChange}
          disabled={parsing}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          rekordbox, Serato 等のプレイリスト画面のスクリーンショット
        </p>
      </div>
      {parsing && <p className="text-sm text-muted-foreground">解析中...</p>}
      <Button type="button" variant="ghost" onClick={close} disabled={parsing}>
        キャンセル
      </Button>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
