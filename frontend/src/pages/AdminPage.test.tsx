import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen } from "../test-utils";
import AdminPage from "./AdminPage";
import { fetchAdminUsers, fetchAdminContent, fetchAdminHealth } from "../features/admin/api";
import { ApiError } from "../api/authorized";
import type { AdminUserStats, AdminContentStats, AdminHealthStats } from "../features/admin/api";

vi.mock("../features/admin/api", () => ({
  fetchAdminUsers: vi.fn(),
  fetchAdminContent: vi.fn(),
  fetchAdminHealth: vi.fn(),
}));

const mockUsers = vi.mocked(fetchAdminUsers);
const mockContent = vi.mocked(fetchAdminContent);
const mockHealth = vi.mocked(fetchAdminHealth);

function buildUsers(overrides?: Partial<AdminUserStats>): AdminUserStats {
  return {
    total: 12,
    confirmed: 10,
    unconfirmed: 2,
    disabled: 1,
    newLast7Days: 3,
    newLast30Days: 7,
    growth: [
      { date: "2026-09-17", signups: 1, cumulative: 11 },
      { date: "2026-09-18", signups: 1, cumulative: 12 },
    ],
    ...overrides,
  };
}

function buildContent(overrides?: Partial<AdminContentStats>): AdminContentStats {
  return {
    setlists: 40,
    published: 25,
    draft: 15,
    totalViews: 1234,
    totalLikes: 56,
    totalTracks: 400,
    activeUsers: 8,
    ...overrides,
  };
}

function buildHealth(overrides?: Partial<AdminHealthStats>): AdminHealthStats {
  return {
    invocations: 500,
    errors: 2,
    errorRate: 0.004,
    throttles: 0,
    avgDurationMs: 123.4,
    maxDurationMs: 900,
    apiRequests: 500,
    apiErrors5xx: 1,
    status: "ok",
    invocationSeries: [],
    errorSeries: [],
    ...overrides,
  };
}

beforeEach(() => {
  mockUsers.mockReset().mockResolvedValue(buildUsers());
  mockContent.mockReset().mockResolvedValue(buildContent());
  mockHealth.mockReset().mockResolvedValue(buildHealth());
});

describe("AdminPage", () => {
  it("shows a loading state before the metrics arrive", () => {
    renderWithProviders(<AdminPage />);

    expect(screen.getByRole("status", { name: "読み込み中" })).toBeInTheDocument();
  });

  it("shows the service health summary", async () => {
    renderWithProviders(<AdminPage />);

    expect(await screen.findByText("正常")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("0.40%")).toBeInTheDocument();
    expect(screen.getByText("123ms")).toBeInTheDocument();
  });

  it("labels a degraded service", async () => {
    mockHealth.mockResolvedValue(buildHealth({ status: "degraded" }));

    renderWithProviders(<AdminPage />);

    expect(await screen.findByText("一部エラー")).toBeInTheDocument();
  });

  it("labels a service that is down", async () => {
    mockHealth.mockResolvedValue(buildHealth({ status: "down" }));

    renderWithProviders(<AdminPage />);

    expect(await screen.findByText("障害")).toBeInTheDocument();
  });

  it("shows the user totals and the signup trend", async () => {
    renderWithProviders(<AdminPage />);

    expect(await screen.findByText("12")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /ユーザー数の推移/ })).toBeInTheDocument();
  });

  it("shows the content totals", async () => {
    renderWithProviders(<AdminPage />);

    expect(await screen.findByText("1234")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("shows only the failing section's error and keeps the rest", async () => {
    mockHealth.mockRejectedValue(new Error("死活メトリクスの取得に失敗しました"));

    renderWithProviders(<AdminPage />);

    expect(await screen.findByText("死活メトリクスの取得に失敗しました")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("explains a 403 as a missing admin permission", async () => {
    mockUsers.mockRejectedValue(new ApiError(403, "管理データの取得に失敗しました"));

    renderWithProviders(<AdminPage />);

    expect(await screen.findByText("管理者権限がありません")).toBeInTheDocument();
  });

  it("falls back to a generic message when the failure is not an Error", async () => {
    mockContent.mockRejectedValue("network down");

    renderWithProviders(<AdminPage />);

    expect(await screen.findByText("エラーが発生しました")).toBeInTheDocument();
  });
});
