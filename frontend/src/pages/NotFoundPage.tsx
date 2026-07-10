import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <h2 className="mb-4 text-xl font-bold">404</h2>
        <p className="text-muted-foreground">お探しのページが見つかりませんでした</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/">トップに戻る</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
