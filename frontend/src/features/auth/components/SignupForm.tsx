import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export function SignupForm() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }

    setLoading(true);
    try {
      await signup(email, password, username);
      navigate("/confirm", { state: { email } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div role="alert" className="error-message">
          {error}
        </div>
      )}
      <div className="form-group">
        <label htmlFor="signup-email" className="label">
          メールアドレス
        </label>
        <input
          id="signup-email"
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="signup-password" className="label">
          パスワード
        </label>
        <input
          id="signup-password"
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>
      <div className="form-group">
        <label htmlFor="signup-username" className="label">
          ユーザー名
        </label>
        <input
          id="signup-username"
          type="text"
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          maxLength={50}
        />
      </div>
      <button type="submit" className="btn" disabled={loading}>
        {loading ? "作成中..." : "アカウント作成"}
      </button>
    </form>
  );
}
