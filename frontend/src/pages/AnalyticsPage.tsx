import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchTrackUsage,
  fetchViews,
  fetchLikes,
  type TrackUsage,
  type TrackLike,
} from "../features/analytics/api";
import { summarizeUsage, topBars, topLikeBars } from "../features/analytics/summary";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [usage, setUsage] = useState<TrackUsage[]>([]);
  const [likes, setLikes] = useState<TrackLike[]>([]);
  const [setlistCount, setSetlistCount] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchTrackUsage(), fetchViews(), fetchLikes()])
      .then(([u, views, l]) => {
        setUsage(u);
        setLikes(l);
        setSetlistCount(views.length);
        setTotalViews(views.reduce((sum, v) => sum + v.viewCount, 0));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "エラーが発生しました"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div role="status" aria-label="読み込み中" className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const summary = summarizeUsage(usage);
  const bars = topBars(usage, 8);
  const likeBars = topLikeBars(likes, 8);

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">分析</h2>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && (
        <>
          {summary.topSong && (
            <div className="mb-3 rounded-xl border border-border bg-card p-5">
              <div className="text-xs text-muted-foreground">最多使用曲</div>
              <div className="mt-1 truncate text-2xl font-bold">{summary.topSong.title}</div>
              {summary.topSong.artist && (
                <div className="truncate text-sm text-muted-foreground">
                  {summary.topSong.artist}
                </div>
              )}
              <div className="mt-2 text-3xl font-bold tabular-nums text-primary">
                {summary.topSong.count}
                <span className="ml-0.5 text-base text-muted-foreground">回</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <StatTile label="総表示回数" value={totalViews} />
            <StatTile label="セットリスト" value={setlistCount} />
            <StatTile label="ユニーク曲" value={summary.uniqueSongs} />
            <StatTile label="総使用回数" value={summary.totalPlays} />
          </div>

          <section className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              よく使う曲 TOP{bars.length || ""}
            </h3>
            {bars.length === 0 ? (
              <p className="text-muted-foreground">
                まだ集計できる曲がありません。セットリストに曲を追加しましょう
              </p>
            ) : (
              <ol className="space-y-3">
                {bars.map((b) => (
                  <li key={b.title}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate">{b.title}</span>
                      <span className="shrink-0 font-bold tabular-nums">{b.count}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${b.ratio * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {likeBars.length > 0 && (
            <section className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                いいねが多い曲
              </h3>
              <ol className="space-y-3">
                {likeBars.map((b) => (
                  <li key={b.title}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate">{b.title}</span>
                      <span className="shrink-0 font-bold tabular-nums">{b.likes}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-pink-500"
                        style={{ width: `${b.ratio * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="mt-6">
            <Link
              to="/analytics/tracks"
              className="text-sm font-medium text-primary hover:underline"
            >
              すべての曲を見る →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
