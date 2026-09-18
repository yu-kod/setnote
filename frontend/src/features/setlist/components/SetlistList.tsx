import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMySetlists, createSetlist, duplicateSetlist } from "../api";
import { sortSetlists, filterSetlists, type SortOrder } from "../browse";
import type { Setlist } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy } from "lucide-react";
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

// 非公開(unpublished)は実質 draft と同じ扱いにする。
const statusVariant: Record<string, "default" | "secondary"> = {
  published: "default",
  draft: "secondary",
  unpublished: "secondary",
};

const statusLabel: Record<string, string> = {
  published: "published",
  draft: "draft",
  unpublished: "draft",
};

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
  const [sortOrder, setSortOrder] = useState<SortOrder>("updated");
  const [query, setQuery] = useState("");
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

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

  // 複製は下書きとして作られるので、そのまま編集画面へ送って次回分の調整に入ってもらう。
  async function handleDuplicate(setlistId: string) {
    setDuplicatingId(setlistId);
    setError("");
    try {
      const copy = await duplicateSetlist(setlistId);
      navigate(`/setlists/${copy.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "複製に失敗しました");
      setDuplicatingId(null);
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

  const visible = sortSetlists(filterSetlists(setlists, query), sortOrder);

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogTrigger asChild>
          <Button>新規作成</Button>
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
      {setlists.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <label htmlFor="setlist-search" className="sr-only">
            セットリストを検索
          </label>
          <Input
            id="setlist-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="セットリスト名・イベント名で検索"
            className="flex-1"
          />
          <label htmlFor="setlist-sort" className="sr-only">
            並び順
          </label>
          <select
            id="setlist-sort"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="h-9 shrink-0 rounded-md border border-border bg-transparent px-2 text-sm text-foreground"
          >
            <option value="updated">更新の新しい順</option>
            <option value="eventDate">開催日の新しい順</option>
          </select>
        </div>
      )}
      {setlists.length === 0 ? (
        <p className="mt-4 text-muted-foreground">
          セットリストがありません。最初のセットリストを作成しましょう
        </p>
      ) : visible.length === 0 ? (
        <p className="mt-4 text-muted-foreground">条件に一致するセットリストがありません</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {visible.map((s) => (
            <li
              key={s.id}
              className="flex items-stretch rounded-lg border border-border bg-card text-card-foreground transition-colors hover:border-primary"
            >
              <button
                className="flex min-w-0 flex-1 items-center gap-3 p-4 text-left"
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
                <Badge variant={statusVariant[s.status]}>{statusLabel[s.status]}</Badge>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`${s.name} を複製`}
                disabled={duplicatingId === s.id}
                onClick={() => handleDuplicate(s.id)}
                className="mr-2 self-center text-muted-foreground"
              >
                <Copy aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
