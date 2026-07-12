import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen } from "../test-utils";
import AnalyticsLikesPage from "./AnalyticsLikesPage";
import { fetchLikes } from "../features/analytics/api";

vi.mock("../features/analytics/api", () => ({
  fetchLikes: vi.fn(),
}));

const mockFetchLikes = vi.mocked(fetchLikes);

beforeEach(() => {
  mockFetchLikes.mockReset();
});

describe("AnalyticsLikesPage", () => {
  it("shows a loading skeleton while fetching", () => {
    mockFetchLikes.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<AnalyticsLikesPage />);

    expect(screen.getByRole("status", { name: "読み込み中" })).toBeInTheDocument();
  });

  it("renders a ranked list of liked tracks", async () => {
    mockFetchLikes.mockResolvedValue([
      { title: "Song A", artist: "DJ X", likes: 10 },
      { title: "Song B", artist: "", likes: 5 },
    ]);

    renderWithProviders(<AnalyticsLikesPage />);

    expect(await screen.findByText("いいねランキング")).toBeInTheDocument();
    expect(screen.getByText("Song A")).toBeInTheDocument();
    expect(screen.getByText("DJ X")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Song B")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows an empty message when there are no likes", async () => {
    mockFetchLikes.mockResolvedValue([]);

    renderWithProviders(<AnalyticsLikesPage />);

    expect(await screen.findByText("まだいいねがありません")).toBeInTheDocument();
  });

  it("shows an error message when loading fails", async () => {
    mockFetchLikes.mockRejectedValue(new Error("boom"));

    renderWithProviders(<AnalyticsLikesPage />);

    expect(await screen.findByText("boom")).toBeInTheDocument();
  });

  it("shows a generic message when the failure is not an Error", async () => {
    mockFetchLikes.mockRejectedValue("network down");

    renderWithProviders(<AnalyticsLikesPage />);

    expect(await screen.findByText("エラーが発生しました")).toBeInTheDocument();
  });

  it("has a back link to the analytics overview", async () => {
    mockFetchLikes.mockResolvedValue([]);

    renderWithProviders(<AnalyticsLikesPage />);

    const link = await screen.findByRole("link", { name: /分析トップ/ });
    expect(link).toHaveAttribute("href", "/analytics");
  });
});
