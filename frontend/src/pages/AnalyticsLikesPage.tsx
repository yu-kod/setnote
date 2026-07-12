import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchLikes, type TrackLike } from "../features/analytics/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLikesPage() {
  const [likes, setLikes] = useState<TrackLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLikes()
      .then(setLikes)
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
      <h2 className="mb-1 mt-2 text-xl font-bold">いいねランキング</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        あなたのセットリスト全体での曲ごとのいいね数
      </p>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && likes.length === 0 ? (
        <p className="mt-4 text-muted-foreground">まだいいねがありません</p>
      ) : (
        <ol className="space-y-2">
          {likes.map((l, i) => (
            <li
              key={l.title}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground"
            >
              <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{l.title}</div>
                {l.artist && (
                  <div className="truncate text-xs text-muted-foreground">{l.artist}</div>
                )}
              </div>
              <span className="shrink-0 text-base font-bold tabular-nums">{l.likes}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
