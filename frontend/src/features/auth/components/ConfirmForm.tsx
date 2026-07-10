import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";

export function ConfirmForm() {
  const { confirmEmail, resendCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { email?: string; fromSignup?: boolean } | null;
  const stateEmail = state?.email ?? "";
  const fromSignup = state?.fromSignup ?? false;

  const [email, setEmail] = useState(stateEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
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

  async function handleResend() {
    setError("");
    setInfo("");
    setResending(true);
    try {
      await resendCode(email);
      setInfo("確認コードを再送信しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "再送信に失敗しました");
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {fromSignup && (
        <div role="status" className="success-message">
          アカウントを作成しました。確認コードをメールで送信しました。
        </div>
      )}
      {info && (
        <div role="status" className="success-message">
          {info}
        </div>
      )}
      {error && (
        <div role="alert" className="error-message">
          {error}
        </div>
      )}
      <p className="text-muted">
        {stateEmail
          ? `${stateEmail} に送信された確認コードを入力してください`
          : "登録時のメールアドレスと確認コードを入力してください"}
      </p>
      {!stateEmail && (
        <div className="form-group">
          <label htmlFor="confirm-email" className="label">
            メールアドレス
          </label>
          <input
            id="confirm-email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
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
      <button
        type="button"
        className="btn-link"
        onClick={handleResend}
        disabled={resending || !email}
      >
        {resending ? "送信中..." : "確認コードを再送信"}
      </button>
    </form>
  );
}
