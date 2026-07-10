import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMySetlists, createSetlist } from "../api";
import type { Setlist } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

const statusVariant: Record<string, "success" | "draft" | "destructive"> = {
  published: "success",
  draft: "draft",
  unpublished: "destructive",
} as const;

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

  if (loading) return <p>読み込み中...</p>;

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <Button onClick={() => handleDialogChange(true)} className="w-full">
          新規作成
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新規作成</DialogTitle>
          </DialogHeader>
          {createError && (
            <Alert variant="destructive">
              <AlertDescription>{createError}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-setlist-name">セットリスト名</Label>
              <Input
                id="new-setlist-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" className="flex-1" disabled={creating}>
                {creating ? "作成中..." : "作成"}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  キャンセル
                </Button>
              </DialogClose>
            </div>
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
                <span className="flex-1 font-semibold">{s.name}</span>
                <Badge variant={statusVariant[s.status]}>{s.status}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.updatedAt).toLocaleDateString("ja-JP")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
