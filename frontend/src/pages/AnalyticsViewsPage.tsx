import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchViews, type ViewRow } from "../features/analytics/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsViewsPage() {
  const [views, setViews] = useState<ViewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchViews()
      .then(setViews)
      .catch((err) => setError(err instanceof Error ? err.message : "エラーが発生しました"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div role="status" aria-label="読み込み中" className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  return (
    <div>
      <Link to="/analytics" className="text-sm text-muted-foreground hover:text-primary">
        ← 分析トップ
      </Link>
      <h2 className="mb-1 mt-2 text-xl font-bold">表示回数ランキング</h2>
      <p className="mb-4 text-sm text-muted-foreground">セットリスト別の表示回数</p>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && views.length === 0 ? (
        <p className="mt-4 text-muted-foreground">
          まだ表示回数がありません。セットリストを公開しましょう
        </p>
      ) : (
        <ol className="space-y-2">
          {views.map((v, i) => (
            <li
              key={v.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground"
            >
              <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{v.name}</div>
              </div>
              <span className="shrink-0 text-base font-bold tabular-nums">{v.viewCount}回</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
