import { Link } from "react-router-dom";
import { SignupForm } from "../features/auth/components/SignupForm";

export default function SignupPage() {
  return (
    <div className="card">
      <h2>アカウント作成</h2>
      <SignupForm />
      <p className="text-muted mt-16 text-center">
        アカウントをお持ちの方は <Link to="/login">ログイン</Link>
      </p>
    </div>
  );
}
