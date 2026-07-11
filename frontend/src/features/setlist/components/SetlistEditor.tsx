import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { fetchSetlist, updateSetlist } from "../api";
import type { Track } from "../types";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldGroup } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sortable, SortableItem, SortableItemHandle } from "@/components/ui/sortable";
import NotFoundPage from "@/pages/NotFoundPage";
import { AddTrackForm } from "./AddTrackForm";
import { TrackCard } from "./TrackCard";

type FormState = {
  name: string;
  eventName: string;
  eventLink: string;
  eventDate: string;
};

const nullToEmpty = (v: string | null) => v ?? "";
const toNullable = (v: string) => (v.trim() ? v.trim() : null);

export function SetlistEditor({ id }: { id: string }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [form, setForm] = useState<FormState>({
    name: "",
    eventName: "",
    eventLink: "",
    eventDate: "",
  });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSetlist(id)
      .then((data) => {
        if (!data) {
          setNotFound(true);
          return;
        }
        setTracks(data.tracks);
        setForm({
          name: data.name,
          eventName: nullToEmpty(data.eventName),
          eventLink: nullToEmpty(data.eventLink),
          eventDate: nullToEmpty(data.eventDate),
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addTrack(track: Track) {
    setTracks((prev) => [...prev, track]);
  }

  function updateTrack(trackId: string, updated: Track) {
    setTracks((prev) => prev.map((t) => (t.id === trackId ? updated : t)));
  }

  function removeTrack(trackId: string) {
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateSetlist(id, {
        name: form.name.trim(),
        eventName: toNullable(form.eventName),
        eventLink: toNullable(form.eventLink),
        eventDate: toNullable(form.eventDate),
        tracks,
      });
      toast.success("保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div role="status" aria-label="読み込み中" className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (notFound) {
    return <NotFoundPage />;
  }

  return (
    <div className="space-y-4">
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary">
        ← ダッシュボードへ戻る
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>セットリストを編集</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <Label htmlFor="setlist-name">セットリスト名</Label>
              <Input
                id="setlist-name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </Field>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field>
                <Label htmlFor="event-name">イベント名</Label>
                <Input
                  id="event-name"
                  value={form.eventName}
                  onChange={(e) => update("eventName", e.target.value)}
                />
              </Field>
              <Field>
                <Label htmlFor="event-date">開催日</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => update("eventDate", e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <Label htmlFor="event-link">イベントリンク</Label>
              <Input
                id="event-link"
                type="url"
                value={form.eventLink}
                onChange={(e) => update("eventLink", e.target.value)}
                placeholder="https://"
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">トラック</h3>
        <Sortable
          value={tracks}
          onValueChange={setTracks}
          getItemValue={(t) => t.id}
          className="space-y-3"
        >
          {tracks.map((track, i) => (
            <SortableItem key={track.id} value={track.id}>
              <TrackCard
                track={track}
                index={i}
                onChange={(updated) => updateTrack(track.id, updated)}
                onDelete={() => removeTrack(track.id)}
                dragHandle={
                  <SortableItemHandle asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="並べ替え"
                      className="text-muted-foreground"
                    >
                      <GripVertical />
                    </Button>
                  </SortableItemHandle>
                }
              />
            </SortableItem>
          ))}
        </Sortable>
        <AddTrackForm onAdd={addTrack} />
      </div>

      <Button
        type="button"
        onClick={handleSave}
        disabled={saving || !form.name.trim()}
        className="w-full"
      >
        {saving ? "保存中..." : "保存"}
      </Button>
    </div>
  );
}
