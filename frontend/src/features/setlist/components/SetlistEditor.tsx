import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  fetchSetlist,
  updateSetlist,
  publishSetlist,
  unpublishSetlist,
  deleteSetlist,
  fetchTrackSuggestions,
  type UpdateSetlistInput,
} from "../api";
import type { Setlist, Track } from "../types";
import { GripVertical } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldGroup } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sortable, SortableItem, SortableItemHandle } from "@/components/ui/sortable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import NotFoundPage from "@/pages/NotFoundPage";
import { AddTrackForm } from "./AddTrackForm";
import { TrackCard } from "./TrackCard";

type FormState = {
  name: string;
  artistName: string;
  eventName: string;
  eventLink: string;
  eventDate: string;
};

type Status = Setlist["status"];

const nullToEmpty = (v: string | null) => v ?? "";
const toNullable = (v: string) => (v.trim() ? v.trim() : null);

export function SetlistEditor({ id }: { id: string }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [form, setForm] = useState<FormState>({
    name: "",
    artistName: "",
    eventName: "",
    eventLink: "",
    eventDate: "",
  });
  const [status, setStatus] = useState<Status>("draft");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [suggestions, setSuggestions] = useState<Track[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // サジェストは非必須。取得失敗しても編集は続行できるよう握りつぶす。
    fetchTrackSuggestions()
      .then(setSuggestions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchSetlist(id)
      .then((data) => {
        if (!data) {
          setNotFound(true);
          return;
        }
        setTracks(data.tracks);
        setStatus(data.status);
        setForm({
          name: data.name,
          artistName: nullToEmpty(data.artistName),
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

  function currentInput(): UpdateSetlistInput {
    return {
      name: form.name.trim(),
      artistName: toNullable(form.artistName),
      eventName: toNullable(form.eventName),
      eventLink: toNullable(form.eventLink),
      eventDate: toNullable(form.eventDate),
      tracks,
    };
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateSetlist(id, currentInput());
      toast.success("保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      // 公開は下書きのスナップショット化なので、直前の編集を保存してから公開する。
      await updateSetlist(id, currentInput());
      const updated = await publishSetlist(id);
      setStatus(updated.status);
      toast.success("公開しました");
    } catch {
      toast.error("公開に失敗しました");
    } finally {
      setPublishing(false);
    }
  }

  async function handleUnpublish() {
    setPublishing(true);
    try {
      const updated = await unpublishSetlist(id);
      setStatus(updated.status);
      toast.success("非公開にしました");
    } catch {
      toast.error("非公開に失敗しました");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteSetlist(id);
      toast.success("削除しました");
      navigate("/dashboard");
    } catch {
      toast.error("削除に失敗しました");
      setDeleting(false);
    }
  }

  const publicUrl = `${window.location.origin}/s/${id}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(publicUrl);
    toast.success("コピーしました");
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
      <div className="flex items-center justify-between gap-2">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary">
          ← ダッシュボードへ戻る
        </Link>
        {status === "published" ? (
          <Button variant="outline" size="sm" onClick={handleUnpublish} disabled={publishing}>
            {publishing ? "処理中..." : "非公開にする"}
          </Button>
        ) : (
          <Button size="sm" onClick={handlePublish} disabled={publishing || !form.name.trim()}>
            {publishing ? "公開中..." : "公開する"}
          </Button>
        )}
      </div>

      {status === "published" && (
        <div className="flex items-center gap-2">
          <Input readOnly aria-label="公開URL" value={publicUrl} className="text-xs" />
          <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
            コピー
          </Button>
        </div>
      )}

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
            <Field>
              <Label htmlFor="artist-name">名義（DJ / アーティスト名）</Label>
              <Input
                id="artist-name"
                value={form.artistName}
                onChange={(e) => update("artistName", e.target.value)}
                placeholder="公開ページに表示される作成者名"
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
        <AddTrackForm onAdd={addTrack} suggestions={suggestions} />
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={saving || !form.name.trim()}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>

      {/* 危険な操作（削除）は下部に分離し、確認ダイアログを挟む。 */}
      <div className="border-t pt-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" size="sm" disabled={deleting}>
              {deleting ? "削除中..." : "セットリストを削除"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>セットリストを削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                この操作は取り消せません。「{form.name}」を完全に削除します。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className={buttonVariants({ variant: "destructive" })}
              >
                削除する
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
