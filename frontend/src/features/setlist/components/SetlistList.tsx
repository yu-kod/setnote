import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMySetlists, createSetlist } from "../api";
import type { Setlist } from "../types";

export function SetlistList() {
  const navigate = useNavigate();
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchMySetlists()
      .then(setSetlists)
      .catch((err) => setError(err instanceof Error ? err.message : "エラーが発生しました"))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await createSetlist(newName.trim());
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
      <button className="btn" onClick={() => setShowDialog(true)}>
        新規作成
      </button>
      {showDialog && (
        <form onSubmit={handleCreate} className="dialog">
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
          <button type="submit" className="btn" disabled={creating}>
            {creating ? "作成中..." : "作成"}
          </button>
          <button type="button" className="btn-link" onClick={() => setShowDialog(false)}>
            キャンセル
          </button>
        </form>
      )}
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
