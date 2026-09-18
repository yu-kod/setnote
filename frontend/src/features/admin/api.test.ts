import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchAdminUsers, fetchAdminContent, fetchAdminHealth } from "./api";
import { authorizedGet } from "../../api/authorized";

vi.mock("../../api/authorized", () => ({
  authorizedGet: vi.fn(),
}));

const mockGet = vi.mocked(authorizedGet);

beforeEach(() => {
  mockGet.mockReset();
  mockGet.mockResolvedValue({} as never);
});

describe("admin api", () => {
  it("fetches user statistics", async () => {
    await fetchAdminUsers();

    expect(mockGet).toHaveBeenCalledWith("/api/admin/users", "管理データの取得に失敗しました");
  });

  it("fetches content statistics", async () => {
    await fetchAdminContent();

    expect(mockGet).toHaveBeenCalledWith("/api/admin/content", "管理データの取得に失敗しました");
  });

  it("fetches health metrics", async () => {
    await fetchAdminHealth();

    expect(mockGet).toHaveBeenCalledWith("/api/admin/health", "管理データの取得に失敗しました");
  });
});
