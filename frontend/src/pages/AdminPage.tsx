import { useEffect, useState } from "react";
import {
  fetchAdminUsers,
  fetchAdminContent,
  fetchAdminHealth,
  type AdminUserStats,
  type AdminContentStats,
  type AdminHealthStats,
} from "../features/admin/api";
import { GrowthChart } from "../features/admin/components/GrowthChart";
import { ApiError } from "../api/authorized";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABEL: Record<AdminHealthStats["status"], string> = {
  ok: "正常",
  degraded: "一部エラー",
  down: "障害",
};

const STATUS_CLASS: Record<AdminHealthStats["status"], string> = {
  ok: "bg-emerald-500/15 text-emerald-600",
  degraded: "bg-amber-500/15 text-amber-600",
  down: "bg-destructive/15 text-destructive",
};

type Section<T> = {
  data: T | null;
  error: string;
};

function describeFailure(reason: unknown): string {
  if (reason instanceof ApiError && reason.status === 403) {
    return "管理者権限がありません";
  }
  return reason instanceof Error ? reason.message : "エラーが発生しました";
}

function toSection<T>(result: PromiseSettledResult<T>): Section<T> {
  return result.status === "fulfilled"
    ? { data: result.value, error: "" }
    : { data: null, error: describeFailure(result.reason) };
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

type SectionCardProps = {
  title: string;
  error: string;
  children?: React.ReactNode;
};

function SectionCard({ title, error, children }: SectionCardProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        children
      )}
    </section>
  );
}

type AdminState = {
  health: Section<AdminHealthStats>;
  users: Section<AdminUserStats>;
  content: Section<AdminContentStats>;
};

export default function AdminPage() {
  const [state, setState] = useState<AdminState | null>(null);

  useEffect(() => {
    Promise.allSettled([fetchAdminHealth(), fetchAdminUsers(), fetchAdminContent()]).then(
      ([health, users, content]) => {
        setState({
          health: toSection(health),
          users: toSection(users),
          content: toSection(content),
        });
      }
    );
  }, []);

  if (!state) {
    return (
      <div role="status" aria-label="読み込み中" className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const health = state.health.data;
  const users = state.users.data;
  const content = state.content.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">管理</h2>
        <p className="text-sm text-muted-foreground">setnote 全体の利用状況と稼働状況</p>
      </div>

      <SectionCard title="稼働状況（直近24時間）" error={state.health.error}>
        {health && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_CLASS[health.status]}`}
              >
                {STATUS_LABEL[health.status]}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="呼び出し" value={`${health.invocations}`} />
              <StatTile label="エラー" value={`${health.errors}`} />
              <StatTile label="エラー率" value={`${(health.errorRate * 100).toFixed(2)}%`} />
              <StatTile label="平均応答" value={`${Math.round(health.avgDurationMs)}ms`} />
              <StatTile label="最大応答" value={`${Math.round(health.maxDurationMs)}ms`} />
              <StatTile label="API 5xx" value={`${health.apiErrors5xx}`} />
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="利用者" error={state.users.error}>
        {users && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="登録ユーザー" value={`${users.total}`} />
              <StatTile label="確認済み" value={`${users.confirmed}`} />
              <StatTile label="未確認" value={`${users.unconfirmed}`} />
              <StatTile label="直近7日" value={`+${users.newLast7Days}`} />
              <StatTile label="直近30日" value={`+${users.newLast30Days}`} />
              <StatTile label="無効" value={`${users.disabled}`} />
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <GrowthChart
                label="ユーザー数の推移"
                points={users.growth.map((p) => ({ date: p.date, value: p.cumulative }))}
              />
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="コンテンツ" error={state.content.error}>
        {content && (
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="セットリスト" value={`${content.setlists}`} />
            <StatTile label="公開中" value={`${content.published}`} />
            <StatTile label="下書き" value={`${content.draft}`} />
            <StatTile label="総表示回数" value={`${content.totalViews}`} />
            <StatTile label="総いいね" value={`${content.totalLikes}`} />
            <StatTile label="作成者" value={`${content.activeUsers}`} />
          </div>
        )}
      </SectionCard>
    </div>
  );
}
