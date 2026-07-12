import { useState } from "react";
import { createTrack } from "../track";
import { matchTracks } from "../trackMatch";
import type { Track } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldGroup } from "@/components/ui/field";

export function AddTrackForm({
  onAdd,
  suggestions = [],
}: {
  onAdd: (track: Track) => void;
  suggestions?: Track[];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  // 入力途中に、過去入力から部分一致する曲を候補表示する。
  // かな・カナ・ローマ字・全半角の違いは matchTracks 側で正規化して吸収する。
  const matches = matchTracks(suggestions, title);

  function close() {
    setTitle("");
    setOpen(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onAdd(createTrack({ title: title.trim() }));
    close();
  }

  // 候補選択：リンク等も含め全項目をコピーした新しいトラックを追加する。
  function selectSuggestion(s: Track) {
    onAdd(
      createTrack({
        title: s.title,
        artist: s.artist,
        songLink: s.songLink,
        source: s.source,
        customFields: s.customFields,
      })
    );
    close();
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(true)}>
        トラックを追加
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg border p-4">
      <FieldGroup>
        <Field>
          <Label htmlFor="new-track-title">曲名</Label>
          <Input
            id="new-track-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="曲名（必須）"
            required
            autoFocus
          />
          {matches.length > 0 && (
            <ul role="listbox" className="mt-1 overflow-hidden rounded-md border">
              {matches.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
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
        </Field>
        <div className="flex gap-2">
          <Button type="submit" disabled={!title.trim()}>
            追加
          </Button>
          <Button type="button" variant="ghost" onClick={close}>
            キャンセル
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
