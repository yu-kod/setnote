import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchTrackUsage,
  fetchViews,
  fetchLikes,
  type TrackUsage,
  type TrackLike,
} from "../features/analytics/api";
import { summarizeUsage } from "../features/analytics/summary";
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

function LinkedStatTile({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-border bg-card p-4 text-center transition-colors hover:bg-muted/50"
    >
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </Link>
  );
}

type RankingCardProps = {
  title: string;
  items: { title: string; artist: string; value: number }[];
  unit: string;
  to: string;
};

function RankingCard({ title, items, unit, to }: RankingCardProps) {
  if (items.length === 0) return null;
  const [first, ...rest] = items;
  return (
    <Link
      to={to}
      className="block rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/50"
    >
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="mt-1 truncate text-2xl font-bold">{first.title}</div>
      {first.artist && <div className="truncate text-sm text-muted-foreground">{first.artist}</div>}
      <div className="mt-2 text-3xl font-bold tabular-nums text-primary">
        {first.value}
        <span className="ml-0.5 text-base text-muted-foreground">{unit}</span>
      </div>
      {rest.length > 0 && (
        <ol className="mt-3 space-y-1 border-t pt-3">
          {rest.map((item, i) => (
            <li key={item.title} className="flex items-baseline justify-between text-sm">
              <span className="truncate text-muted-foreground">
                {i + 2}. {item.title}
              </span>
              <span className="shrink-0 tabular-nums">
                {item.value}
                {unit}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Link>
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
  const topLikes = [...likes].sort((a, b) => b.likes - a.likes).slice(0, 3);

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">分析</h2>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && (
        <div className="space-y-4">
          <RankingCard
            title="最多使用曲"
            items={summary.topSongs.map((s) => ({
              title: s.title,
              artist: s.artist,
              value: s.count,
            }))}
            unit="回"
            to="/analytics/tracks"
          />

          <div className="grid grid-cols-2 gap-3">
            <StatTile label="総表示回数" value={totalViews} />
            <StatTile label="セットリスト" value={setlistCount} />
            <LinkedStatTile label="ユニーク曲" value={summary.uniqueSongs} to="/analytics/tracks" />
            <StatTile label="総使用回数" value={summary.totalPlays} />
          </div>

          <RankingCard
            title="いいねが多い曲"
            items={topLikes.map((l) => ({
              title: l.title,
              artist: l.artist,
              value: l.likes,
            }))}
            unit=""
            to="/analytics/likes"
          />
        </div>
      )}
    </div>
  );
}
