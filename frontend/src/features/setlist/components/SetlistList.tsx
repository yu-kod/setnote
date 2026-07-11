import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMySetlists, createSetlist } from "../api";
import type { Setlist } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, FieldGroup } from "@/components/ui/field";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  published: "default",
  draft: "secondary",
  unpublished: "destructive",
} as const;

// 開催日（YYYY-MM-DD）をタイムゾーンに依存せず表示用に整形する。
function formatEventDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${year}/${Number(month)}/${Number(day)}`;
}

export function SetlistList() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchMySetlists()
      .then(setSetlists)
      .catch((err) => setError(err instanceof Error ? err.message : "エラーが発生しました"))
      .finally(() => setLoading(false));
  }, []);

  function handleDialogChange(open: boolean) {
    setDialogOpen(open);
    if (open) {
      setNewName("");
      setCreateError("");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await createSetlist(newName.trim());
      setDialogOpen(false);
      navigate(`/setlists/${created.id}/edit`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div role="status" aria-label="読み込み中" className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[68px] w-full" />
        <Skeleton className="h-[68px] w-full" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogTrigger asChild>
          <Button className="w-full">新規作成</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>新規作成</DialogTitle>
              <DialogDescription>セットリストの名前を入力してください。</DialogDescription>
            </DialogHeader>
            {createError && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}
            <FieldGroup className="py-4">
              <Field>
                <Label htmlFor="new-setlist-name">セットリスト名</Label>
                <Input
                  id="new-setlist-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  キャンセル
                </Button>
              </DialogClose>
              <Button type="submit" disabled={creating}>
                {creating ? "作成中..." : "作成"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {setlists.length === 0 ? (
        <p className="mt-4 text-muted-foreground">
          セットリストがありません。最初のセットリストを作成しましょう
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {setlists.map((s) => (
            <li key={s.id}>
              <button
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left text-card-foreground transition-colors hover:border-primary"
                onClick={() => navigate(`/setlists/${s.id}/edit`)}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{s.name}</div>
                  {(s.eventName || s.eventDate) && (
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[s.eventName, s.eventDate ? formatEventDate(s.eventDate) : null]
                        .filter(Boolean)
                        .join(" ・ ")}
                    </div>
                  )}
                </div>
                <Badge variant={statusVariant[s.status]}>{s.status}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
