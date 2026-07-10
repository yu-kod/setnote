import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMySetlists, createSetlist } from "../api";
import type { Setlist } from "../types";

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
        <div role="alert" className="error-message">
          {error}
        </div>
      )}
      <button className="btn" onClick={openDialog}>
        新規作成
      </button>
      <dialog ref={dialogRef} className="modal">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label htmlFor="new-setlist-name" className="label">
              セットリスト名
            </label>
            <input
              id="new-setlist-name"
              type="text"
              className="input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn" disabled={creating}>
              {creating ? "作成中..." : "作成"}
            </button>
            <button type="button" className="btn-link" onClick={closeDialog}>
              キャンセル
            </button>
          </div>
        </form>
      </dialog>
      {setlists.length === 0 ? (
        <p>セットリストがありません。最初のセットリストを作成しましょう</p>
      ) : (
        <ul className="setlist-list">
          {setlists.map((s) => (
            <li key={s.id} className="setlist-item">
              <button
                className="setlist-item-button"
                onClick={() => navigate(`/setlists/${s.id}/edit`)}
              >
                <span className="setlist-name">{s.name}</span>
                <span className={`badge badge-${s.status}`}>{s.status}</span>
                <span className="setlist-date">
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
