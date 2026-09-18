import { describe, it, expect } from "vitest";
import { summarizeHealth } from "./health";

function series(id: string, points: [string, number][]) {
  return {
    Id: id,
    Timestamps: points.map(([t]) => new Date(t)),
    Values: points.map(([, v]) => v),
  };
}

describe("summarizeHealth", () => {
  it("reports ok with zeroed numbers when CloudWatch returns no data", () => {
    const health = summarizeHealth([]);

    expect(health).toEqual({
      invocations: 0,
      errors: 0,
      errorRate: 0,
      throttles: 0,
      avgDurationMs: 0,
      maxDurationMs: 0,
      apiRequests: 0,
      apiErrors5xx: 0,
      status: "ok",
      invocationSeries: [],
      errorSeries: [],
    });
  });

  it("sums invocations, errors and throttles across the window", () => {
    const health = summarizeHealth([
      series("invocations", [
        ["2026-09-18T01:00:00Z", 10],
        ["2026-09-18T02:00:00Z", 5],
      ]),
      series("errors", [["2026-09-18T02:00:00Z", 3]]),
      series("throttles", [["2026-09-18T02:00:00Z", 1]]),
    ]);

    expect(health.invocations).toBe(15);
    expect(health.errors).toBe(3);
    expect(health.throttles).toBe(1);
    expect(health.errorRate).toBeCloseTo(0.2);
  });

  it("averages duration over the reported points and keeps the peak", () => {
    const health = summarizeHealth([
      series("duration", [
        ["2026-09-18T01:00:00Z", 100],
        ["2026-09-18T02:00:00Z", 300],
      ]),
    ]);

    expect(health.avgDurationMs).toBe(200);
    expect(health.maxDurationMs).toBe(300);
  });

  it("keeps the error rate at zero when there were no invocations", () => {
    const health = summarizeHealth([series("errors", [["2026-09-18T02:00:00Z", 2]])]);

    expect(health.errorRate).toBe(0);
  });

  it("returns the invocation and error series sorted oldest first", () => {
    const health = summarizeHealth([
      series("invocations", [
        ["2026-09-18T02:00:00Z", 5],
        ["2026-09-18T01:00:00Z", 10],
      ]),
      series("errors", [
        ["2026-09-18T02:00:00Z", 1],
        ["2026-09-18T01:00:00Z", 0],
      ]),
    ]);

    expect(health.invocationSeries).toEqual([
      { time: "2026-09-18T01:00:00.000Z", value: 10 },
      { time: "2026-09-18T02:00:00.000Z", value: 5 },
    ]);
    expect(health.errorSeries).toEqual([
      { time: "2026-09-18T01:00:00.000Z", value: 0 },
      { time: "2026-09-18T02:00:00.000Z", value: 1 },
    ]);
  });

  it("is degraded when a small share of requests fail", () => {
    const health = summarizeHealth([
      series("invocations", [["2026-09-18T01:00:00Z", 100]]),
      series("errors", [["2026-09-18T01:00:00Z", 5]]),
    ]);

    expect(health.status).toBe("degraded");
  });

  it("is down when at least half of the invocations fail", () => {
    const health = summarizeHealth([
      series("invocations", [["2026-09-18T01:00:00Z", 100]]),
      series("errors", [["2026-09-18T01:00:00Z", 60]]),
    ]);

    expect(health.status).toBe("down");
  });

  it("uses the API Gateway 5xx rate when it is worse than the Lambda error rate", () => {
    const health = summarizeHealth([
      series("invocations", [["2026-09-18T01:00:00Z", 100]]),
      series("apiRequests", [["2026-09-18T01:00:00Z", 100]]),
      series("api5xx", [["2026-09-18T01:00:00Z", 80]]),
    ]);

    expect(health.apiRequests).toBe(100);
    expect(health.apiErrors5xx).toBe(80);
    expect(health.status).toBe("down");
  });

  it("stays ok when API Gateway served requests without 5xx", () => {
    const health = summarizeHealth([
      series("apiRequests", [["2026-09-18T01:00:00Z", 100]]),
      series("api5xx", [["2026-09-18T01:00:00Z", 0]]),
    ]);

    expect(health.status).toBe("ok");
  });

  it("ignores series it does not know about and series with no values", () => {
    const health = summarizeHealth([
      { Id: "mystery", Timestamps: [new Date("2026-09-18T01:00:00Z")], Values: [42] },
      { Id: "invocations" },
    ]);

    expect(health.invocations).toBe(0);
    expect(health.invocationSeries).toEqual([]);
  });

  it("ignores a point whose timestamp has no matching value", () => {
    const health = summarizeHealth([
      {
        Id: "invocations",
        Timestamps: [new Date("2026-09-18T01:00:00Z"), new Date("2026-09-18T02:00:00Z")],
        Values: [7],
      },
    ]);

    expect(health.invocations).toBe(7);
    expect(health.invocationSeries).toEqual([{ time: "2026-09-18T01:00:00.000Z", value: 7 }]);
  });
});
