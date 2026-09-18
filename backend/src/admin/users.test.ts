import { describe, it, expect } from "vitest";
import { aggregateUsers } from "./users";

const NOW = new Date("2026-09-18T05:00:00Z");

describe("aggregateUsers", () => {
  it("counts zero for an empty user pool", () => {
    const stats = aggregateUsers([], NOW);

    expect(stats.total).toBe(0);
    expect(stats.confirmed).toBe(0);
    expect(stats.unconfirmed).toBe(0);
    expect(stats.disabled).toBe(0);
    expect(stats.newLast7Days).toBe(0);
    expect(stats.newLast30Days).toBe(0);
  });

  it("splits users by confirmation status and enabled flag", () => {
    const stats = aggregateUsers(
      [
        { UserStatus: "CONFIRMED", Enabled: true, UserCreateDate: "2026-09-17T01:00:00Z" },
        { UserStatus: "CONFIRMED", Enabled: false, UserCreateDate: "2026-09-17T02:00:00Z" },
        { UserStatus: "UNCONFIRMED", Enabled: true, UserCreateDate: "2026-09-17T03:00:00Z" },
      ],
      NOW
    );

    expect(stats.total).toBe(3);
    expect(stats.confirmed).toBe(2);
    expect(stats.unconfirmed).toBe(1);
    expect(stats.disabled).toBe(1);
  });

  it("treats a user with no status or enabled flag as unconfirmed and enabled", () => {
    const stats = aggregateUsers([{ UserCreateDate: "2026-09-17T01:00:00Z" }], NOW);

    expect(stats.total).toBe(1);
    expect(stats.confirmed).toBe(0);
    expect(stats.unconfirmed).toBe(1);
    expect(stats.disabled).toBe(0);
  });

  it("counts signups within the last 7 and 30 days", () => {
    const stats = aggregateUsers(
      [
        { UserCreateDate: "2026-09-17T00:00:00Z" },
        { UserCreateDate: "2026-09-14T00:00:00Z" },
        { UserCreateDate: "2026-09-01T00:00:00Z" },
        { UserCreateDate: "2026-01-01T00:00:00Z" },
      ],
      NOW
    );

    expect(stats.newLast7Days).toBe(2);
    expect(stats.newLast30Days).toBe(3);
  });

  it("returns a 30 day daily series ending today in JST", () => {
    const stats = aggregateUsers([], NOW);

    expect(stats.growth).toHaveLength(30);
    expect(stats.growth[29].date).toBe("2026-09-18");
    expect(stats.growth[0].date).toBe("2026-08-20");
  });

  it("buckets signups into JST days and accumulates the running total", () => {
    const stats = aggregateUsers(
      [
        // 2026-09-17T16:00Z は JST では 2026-09-18 01:00
        { UserCreateDate: "2026-09-17T16:00:00Z" },
        { UserCreateDate: "2026-09-17T10:00:00Z" },
        { UserCreateDate: "2026-09-17T11:00:00Z" },
      ],
      NOW
    );

    const sep17 = stats.growth.find((p) => p.date === "2026-09-17");
    const sep18 = stats.growth.find((p) => p.date === "2026-09-18");
    expect(sep17).toEqual({ date: "2026-09-17", signups: 2, cumulative: 2 });
    expect(sep18).toEqual({ date: "2026-09-18", signups: 1, cumulative: 3 });
  });

  it("includes users created before the window in the cumulative total", () => {
    const stats = aggregateUsers([{ UserCreateDate: "2025-01-01T00:00:00Z" }], NOW);

    expect(stats.growth[0]).toEqual({ date: "2026-08-20", signups: 0, cumulative: 1 });
    expect(stats.growth[29].cumulative).toBe(1);
  });

  it("accepts Date objects as returned by the Cognito SDK", () => {
    const stats = aggregateUsers([{ UserCreateDate: new Date("2026-09-17T10:00:00Z") }], NOW);

    expect(stats.newLast7Days).toBe(1);
    expect(stats.growth[29].cumulative).toBe(1);
  });

  it("ignores users with no creation date in the series but still counts them", () => {
    const stats = aggregateUsers([{ UserStatus: "CONFIRMED" }], NOW);

    expect(stats.total).toBe(1);
    expect(stats.newLast30Days).toBe(0);
    expect(stats.growth[29].cumulative).toBe(0);
  });
});
