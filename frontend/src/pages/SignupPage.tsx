import { Link } from "react-router-dom";
import { SignupForm } from "../features/auth/components/SignupForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-xl font-bold">アカウント作成</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SignupForm />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          アカウントをお持ちの方は{" "}
          <Link to="/login" className="text-primary hover:text-primary/80">
            ログイン
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
