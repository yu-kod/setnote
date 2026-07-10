import { Link } from "react-router-dom";
import { LoginForm } from "../features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="card">
      <h2>ログイン</h2>
      <LoginForm />
      <p className="text-muted mt-16 text-center">
        アカウントをお持ちでない方は <Link to="/signup">アカウント作成</Link>
      </p>
    </div>
  );
}
