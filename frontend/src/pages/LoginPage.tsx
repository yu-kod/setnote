import { Link } from "react-router-dom";
import { LoginForm } from "../features/auth/components/LoginForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-xl font-bold">ログイン</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <LoginForm />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          アカウントをお持ちでない方は{" "}
          <Link to="/signup" className="text-primary hover:text-primary/80">
            アカウント作成
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
