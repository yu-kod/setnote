import { useState } from "react";
import { createTrack } from "../track";
import type { Track } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldGroup } from "@/components/ui/field";

export function AddTrackForm({ onAdd }: { onAdd: (track: Track) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  function close() {
    setTitle("");
    setOpen(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onAdd(createTrack({ title: title.trim() }));
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
