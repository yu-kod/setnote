import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";

export function ConfirmForm() {
  const { confirmEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string })?.email ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await confirmEmail(email, code);
      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="text-muted">{email} に送信された確認コードを入力してください</p>
      {error && (
        <div role="alert" className="error-message">
          {error}
        </div>
      )}
      <div className="form-group">
        <label htmlFor="confirm-code" className="label">
          確認コード
        </label>
        <input
          id="confirm-code"
          type="text"
          className="input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          maxLength={6}
          inputMode="numeric"
        />
      </div>
      <button type="submit" className="btn" disabled={loading}>
        {loading ? "確認中..." : "確認する"}
      </button>
    </form>
  );
}
