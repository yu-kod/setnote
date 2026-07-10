import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

export default function SetlistPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-muted-foreground">セットリスト: {id}</p>
        <p className="mt-4 text-sm text-muted-foreground">（実装予定）</p>
      </CardContent>
    </Card>
  );
}
