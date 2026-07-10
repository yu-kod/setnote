import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    if (!/[a-z]/.test(password)) {
      setError("パスワードに小文字を含めてください");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("パスワードに大文字を含めてください");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("パスワードに数字を含めてください");
      return;
    }

    setLoading(true);
    try {
      await signup(email, password, username);
      navigate("/confirm", { state: { email, fromSignup: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="signup-email">メールアドレス</Label>
        <Input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">パスワード</Label>
        <Input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-username">ユーザー名</Label>
        <Input
          id="signup-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          maxLength={50}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "作成中..." : "アカウント作成"}
      </Button>
    </form>
  );
}
