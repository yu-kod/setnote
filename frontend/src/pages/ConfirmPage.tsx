import { ConfirmForm } from "../features/auth/components/ConfirmForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConfirmPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-xl font-bold">メールアドレスの確認</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ConfirmForm />
      </CardContent>
    </Card>
  );
}
