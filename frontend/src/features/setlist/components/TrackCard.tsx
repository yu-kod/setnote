import { X } from "lucide-react";
import { createCustomField } from "../track";
import type { Track, CustomField } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

type Props = {
  track: Track;
  index: number;
  onChange: (track: Track) => void;
  onDelete: () => void;
};

export function TrackCard({ track, index, onChange, onDelete }: Props) {
  const set = (patch: Partial<Track>) => onChange({ ...track, ...patch });

  const setField = (id: string, patch: Partial<CustomField>) =>
    onChange({
      ...track,
      customFields: track.customFields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });

  const addField = () =>
    onChange({ ...track, customFields: [...track.customFields, createCustomField()] });

  const removeField = (id: string) =>
    onChange({ ...track, customFields: track.customFields.filter((f) => f.id !== id) });

  return (
    <Card role="group" aria-label={`トラック ${index + 1}`}>
      <CardContent className="space-y-3 pt-6">
        <Input
          aria-label="曲名"
          value={track.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="曲名（必須）"
          required
        />
        <Input
          aria-label="アーティスト"
          value={track.artist}
          onChange={(e) => set({ artist: e.target.value })}
          placeholder="アーティスト"
        />
        <Input
          aria-label="楽曲リンク"
          value={track.songLink}
          onChange={(e) => set({ songLink: e.target.value })}
          placeholder="楽曲リンク（YouTube / Spotify / SoundCloud）"
        />
        <Input
          aria-label="入手元"
          value={track.source}
          onChange={(e) => set({ source: e.target.value })}
          placeholder="入手元（リンクまたはテキスト）"
        />

        {track.customFields.map((f) => (
          <div key={f.id} className="flex items-center gap-2">
            <Input
              aria-label="項目名"
              value={f.label}
              onChange={(e) => setField(f.id, { label: e.target.value })}
              placeholder="項目名（例: BPM）"
            />
            <Input
              aria-label="値"
              value={f.value}
              onChange={(e) => setField(f.id, { value: e.target.value })}
              placeholder="値"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="項目を削除"
              onClick={() => removeField(f.id)}
            >
              <X />
            </Button>
          </div>
        ))}

        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={addField}>
            項目を追加
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                削除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>このトラックを削除しますか？</AlertDialogTitle>
                <AlertDialogDescription>この操作は取り消せません。</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>削除</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
