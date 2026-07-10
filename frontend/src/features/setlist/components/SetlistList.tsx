import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMySetlists, createSetlist } from "../api";
import type { Setlist } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const statusVariant: Record<string, "success" | "draft" | "destructive"> = {
  published: "success",
  draft: "draft",
  unpublished: "destructive",
} as const;

export function SetlistList() {
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchMySetlists()
      .then(setSetlists)
      .catch((err) => setError(err instanceof Error ? err.message : "エラーが発生しました"))
      .finally(() => setLoading(false));
  }, []);

  function openDialog() {
    setNewName("");
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await createSetlist(newName.trim());
      closeDialog();
      navigate(`/setlists/${created.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
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
      <Button onClick={openDialog} className="w-full">
        新規作成
      </Button>
      <dialog
        ref={dialogRef}
        className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg backdrop:bg-black/70"
      >
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
            <Button type="button" variant="ghost" onClick={closeDialog}>
              キャンセル
            </Button>
          </div>
        </form>
      </dialog>
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
