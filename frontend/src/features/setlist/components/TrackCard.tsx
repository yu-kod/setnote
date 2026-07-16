import * as React from "react";
import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createCustomField } from "../track";
import { matchTracks } from "../trackMatch";
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

function InlineInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn(
        "h-auto rounded-none border-0 bg-transparent px-0 py-0.5 shadow-none focus-visible:ring-0 dark:bg-transparent",
        className
      )}
      {...props}
    />
  );
}

type Props = {
  track: Track;
  index: number;
  onChange: (track: Track) => void;
  onDelete: () => void;
  dragHandle?: React.ReactNode;
  suggestions?: Track[];
};

export function TrackCard({
  track,
  index,
  onChange,
  onDelete,
  dragHandle,
  suggestions = [],
}: Props) {
  const [titleFocused, setTitleFocused] = useState(false);

  const set = (patch: Partial<Track>) => onChange({ ...track, ...patch });

  const matches = titleFocused && track.title.trim() ? matchTracks(suggestions, track.title) : [];

  function selectSuggestion(s: Track) {
    onChange({
      ...track,
      title: s.title,
      artist: s.artist,
      songLink: s.songLink,
      source: s.source,
      customFields: s.customFields,
    });
    setTitleFocused(false);
  }

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
    <Card role="group" aria-label={`トラック ${index + 1}`} className="py-3 gap-2">
      <CardContent className="space-y-0.5 px-3">
        <div className="flex items-center gap-2">
          {dragHandle}
          <div className="relative min-w-0 flex-1">
            <InlineInput
              aria-label="曲名"
              value={track.title}
              onChange={(e) => set({ title: e.target.value })}
              onFocus={() => setTitleFocused(true)}
              onBlur={() => setTitleFocused(false)}
              placeholder="曲名（必須）"
              className="text-base font-semibold"
            />
            {matches.length > 0 && (
              <ul
                role="listbox"
                className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-md border bg-popover shadow-md"
              >
                {matches.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectSuggestion(s)}
                      className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted/50"
                    >
                      <span className="font-medium">{s.title}</span>
                      {s.artist && <span className="text-muted-foreground">— {s.artist}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="削除"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 />
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

        <InlineInput
          aria-label="アーティスト"
          value={track.artist}
          onChange={(e) => set({ artist: e.target.value })}
          placeholder="アーティストを追加"
          className="text-sm text-muted-foreground"
        />
        <InlineInput
          aria-label="楽曲リンク"
          value={track.songLink}
          onChange={(e) => set({ songLink: e.target.value })}
          placeholder="楽曲リンクを追加（YouTube / Spotify / SoundCloud）"
          className="text-sm text-muted-foreground"
        />
        <InlineInput
          aria-label="入手元"
          value={track.source}
          onChange={(e) => set({ source: e.target.value })}
          placeholder="入手元を追加"
          className="text-sm text-muted-foreground"
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
          {track.customFields.map((f) => (
            <div key={f.id} className="flex items-center gap-1 text-sm">
              <InlineInput
                aria-label="項目名"
                value={f.label}
                onChange={(e) => setField(f.id, { label: e.target.value })}
                placeholder="項目"
                className="w-20 text-muted-foreground"
              />
              <span className="text-muted-foreground">:</span>
              <InlineInput
                aria-label="値"
                value={f.value}
                onChange={(e) => setField(f.id, { value: e.target.value })}
                placeholder="値"
                className="w-20"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="項目を削除"
                className="size-6 text-muted-foreground"
                onClick={() => removeField(f.id)}
              >
                <X />
              </Button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="px-0 text-muted-foreground"
          onClick={addField}
        >
          項目を追加
        </Button>
      </CardContent>
    </Card>
  );
}
