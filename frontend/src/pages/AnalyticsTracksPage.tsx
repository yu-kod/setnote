import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTrackUsage, type TrackUsage } from "../features/analytics/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsTracksPage() {
  const [usage, setUsage] = useState<TrackUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTrackUsage()
      .then(setUsage)
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
      <h2 className="mb-1 mt-2 text-xl font-bold">曲の使用回数</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        あなたのセットリスト全体での曲ごとの使用回数
      </p>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && usage.length === 0 ? (
        <p className="mt-4 text-muted-foreground">
          まだ集計できる曲がありません。セットリストに曲を追加しましょう
        </p>
      ) : (
        <ol className="space-y-2">
          {usage.map((u, i) => (
            <li
              key={u.title}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground"
            >
              <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{u.title}</div>
                {u.artist && (
                  <div className="truncate text-xs text-muted-foreground">{u.artist}</div>
                )}
              </div>
              <span className="shrink-0 text-base font-bold tabular-nums">{u.count}回</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
