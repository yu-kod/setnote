/** CloudWatch GetMetricData が返す1系列。 */
export type MetricSeries = {
  Id?: string;
  Timestamps?: Date[];
  Values?: number[];
};

export type HealthPoint = {
  /** ISO 8601 の時刻 */
  time: string;
  value: number;
};

export type HealthStatus = "ok" | "degraded" | "down";

export type HealthStats = {
  invocations: number;
  errors: number;
  /** errors / invocations。呼び出しが無いときは 0。 */
  errorRate: number;
  throttles: number;
  avgDurationMs: number;
  maxDurationMs: number;
  apiRequests: number;
  apiErrors5xx: number;
  status: HealthStatus;
  invocationSeries: HealthPoint[];
  errorSeries: HealthPoint[];
};

/** degraded と判定するエラー率の下限。 */
const DEGRADED_RATE = 0.01;
/** down と判定するエラー率の下限。 */
const DOWN_RATE = 0.5;

function toPoints(series: MetricSeries | undefined): HealthPoint[] {
  const timestamps = series?.Timestamps ?? [];
  const values = series?.Values ?? [];
  return (
    timestamps
      .map((at, i) => ({ at, value: values[i] }))
      // 値の無いタイムスタンプ（CloudWatch が欠測を返すケース）は捨てる。
      .filter((p): p is { at: Date; value: number } => p.value !== undefined)
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .map((p) => ({ time: p.at.toISOString(), value: p.value }))
  );
}

function sum(points: HealthPoint[]): number {
  return points.reduce((total, p) => total + p.value, 0);
}

function rate(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function classify(worstRate: number): HealthStatus {
  if (worstRate >= DOWN_RATE) return "down";
  if (worstRate > DEGRADED_RATE) return "degraded";
  return "ok";
}

/**
 * CloudWatch の結果を管理画面向けの死活サマリに変換する。
 * Lambda のエラー率と API Gateway の 5xx 率のうち、悪いほうでステータスを決める。
 */
export function summarizeHealth(results: MetricSeries[]): HealthStats {
  const byId = new Map(results.map((r) => [r.Id, r]));

  const invocationSeries = toPoints(byId.get("invocations"));
  const errorSeries = toPoints(byId.get("errors"));
  const durationPoints = toPoints(byId.get("duration"));
  const apiRequestSeries = toPoints(byId.get("apiRequests"));
  const api5xxSeries = toPoints(byId.get("api5xx"));

  const invocations = sum(invocationSeries);
  const errors = sum(errorSeries);
  const apiRequests = sum(apiRequestSeries);
  const apiErrors5xx = sum(api5xxSeries);
  const errorRate = rate(errors, invocations);

  return {
    invocations,
    errors,
    errorRate,
    throttles: sum(toPoints(byId.get("throttles"))),
    avgDurationMs: durationPoints.length === 0 ? 0 : sum(durationPoints) / durationPoints.length,
    maxDurationMs: durationPoints.reduce((max, p) => Math.max(max, p.value), 0),
    apiRequests,
    apiErrors5xx,
    status: classify(Math.max(errorRate, rate(apiErrors5xx, apiRequests))),
    invocationSeries,
    errorSeries,
  };
}
