import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    <form onSubmit={handleSubmit} className="space-y-4">
      {fromSignup && (
        <Alert variant="success" role="status">
          <AlertDescription>
            アカウントを作成しました。確認コードをメールで送信しました。
          </AlertDescription>
        </Alert>
      )}
      {info && (
        <Alert variant="success" role="status">
          <AlertDescription>{info}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <p className="text-sm text-muted-foreground">
        {stateEmail
          ? `${stateEmail} に送信された確認コードを入力してください`
          : "登録時のメールアドレスと確認コードを入力してください"}
      </p>
      {!stateEmail && (
        <div className="space-y-2">
          <Label htmlFor="confirm-email">メールアドレス</Label>
          <Input
            id="confirm-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="confirm-code">確認コード</Label>
        <Input
          id="confirm-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          maxLength={6}
          inputMode="numeric"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "確認中..." : "確認する"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground"
        onClick={handleResend}
        disabled={resending || !email}
      >
        {resending ? "送信中..." : "確認コードを再送信"}
      </Button>
    </form>
  );
}
