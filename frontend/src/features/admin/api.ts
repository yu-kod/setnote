import { authorizedGet } from "../../api/authorized";

export type UserGrowthPoint = {
  date: string;
  signups: number;
  cumulative: number;
};

export type AdminUserStats = {
  total: number;
  confirmed: number;
  unconfirmed: number;
  disabled: number;
  newLast7Days: number;
  newLast30Days: number;
  growth: UserGrowthPoint[];
};

export type AdminContentStats = {
  setlists: number;
  published: number;
  draft: number;
  totalViews: number;
  totalLikes: number;
  totalTracks: number;
  activeUsers: number;
};

export type HealthPoint = {
  time: string;
  value: number;
};

export type AdminHealthStats = {
  invocations: number;
  errors: number;
  errorRate: number;
  throttles: number;
  avgDurationMs: number;
  maxDurationMs: number;
  apiRequests: number;
  apiErrors5xx: number;
  status: "ok" | "degraded" | "down";
  invocationSeries: HealthPoint[];
  errorSeries: HealthPoint[];
};

const ERROR_MESSAGE = "管理データの取得に失敗しました";

/** 利用者数の合計と登録推移を取得する。 */
export function fetchAdminUsers(): Promise<AdminUserStats> {
  return authorizedGet<AdminUserStats>("/api/admin/users", ERROR_MESSAGE);
}

/** セットリストや表示回数などのコンテンツ統計を取得する。 */
export function fetchAdminContent(): Promise<AdminContentStats> {
  return authorizedGet<AdminContentStats>("/api/admin/content", ERROR_MESSAGE);
}

/** Lambda / API Gateway の死活メトリクスを取得する。 */
export function fetchAdminHealth(): Promise<AdminHealthStats> {
  return authorizedGet<AdminHealthStats>("/api/admin/health", ERROR_MESSAGE);
}
