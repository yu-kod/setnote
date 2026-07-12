import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen } from "../test-utils";
import AnalyticsPage from "./AnalyticsPage";
import { fetchTrackUsage, fetchViews, fetchLikes } from "../features/analytics/api";

vi.mock("../features/analytics/api", () => ({
  fetchTrackUsage: vi.fn(),
  fetchViews: vi.fn(),
  fetchLikes: vi.fn(),
}));

const mockFetchTrackUsage = vi.mocked(fetchTrackUsage);
const mockFetchViews = vi.mocked(fetchViews);
const mockFetchLikes = vi.mocked(fetchLikes);

beforeEach(() => {
  mockFetchTrackUsage.mockReset();
  mockFetchViews.mockReset();
  mockFetchLikes.mockReset();
  mockFetchViews.mockResolvedValue([]);
  mockFetchLikes.mockResolvedValue([]);
});

describe("AnalyticsPage", () => {
  it("shows a loading indicator before data arrives", () => {
    mockFetchTrackUsage.mockReturnValue(new Promise(() => {}));
    mockFetchLikes.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<AnalyticsPage />);

    expect(screen.getByRole("status", { name: "読み込み中" })).toBeInTheDocument();
  });

  it("shows the top usage card with top 3 songs that links to /analytics/tracks", async () => {
    mockFetchTrackUsage.mockResolvedValue([
      { title: "Song A", artist: "DJ X", count: 5 },
      { title: "Song B", artist: "", count: 3 },
      { title: "Song C", artist: "", count: 2 },
      { title: "Song D", artist: "", count: 1 },
    ]);

    renderWithProviders(<AnalyticsPage />);

    expect(await screen.findByText("最多使用曲")).toBeInTheDocument();
    expect(screen.getByText("Song A")).toBeInTheDocument();
    expect(screen.getByText("2. Song B")).toBeInTheDocument();
    expect(screen.getByText("3. Song C")).toBeInTheDocument();
    // 4位は表示されない
    expect(screen.queryByText("Song D")).not.toBeInTheDocument();
    // カードはリンク
    expect(screen.getByRole("link", { name: /最多使用曲/ })).toHaveAttribute(
      "href",
      "/analytics/tracks"
    );
  });

  it("shows KPI tiles including a clickable unique songs tile", async () => {
    mockFetchTrackUsage.mockResolvedValue([
      { title: "Song A", artist: "", count: 5 },
      { title: "Song B", artist: "", count: 2 },
    ]);
    mockFetchViews.mockResolvedValue([
      { id: "1", name: "S1", viewCount: 10 },
      { id: "2", name: "S2", viewCount: 4 },
    ]);

    renderWithProviders(<AnalyticsPage />);

    await screen.findByText("最多使用曲");
    expect(screen.getByText("総表示回数").previousSibling).toHaveTextContent("14");
    expect(screen.getByText("セットリスト").previousSibling).toHaveTextContent("2");
    expect(screen.getByText("総使用回数").previousSibling).toHaveTextContent("7");
    // ユニーク曲はリンク
    expect(screen.getByRole("link", { name: /ユニーク曲/ })).toHaveAttribute(
      "href",
      "/analytics/tracks"
    );
  });

  it("shows the likes ranking card with top 3 that links to /analytics/likes", async () => {
    mockFetchTrackUsage.mockResolvedValue([]);
    mockFetchLikes.mockResolvedValue([
      { title: "Liked A", artist: "DJ Z", likes: 8 },
      { title: "Liked B", artist: "", likes: 5 },
      { title: "Liked C", artist: "", likes: 3 },
    ]);

    renderWithProviders(<AnalyticsPage />);

    expect(await screen.findByText("いいねが多い曲")).toBeInTheDocument();
    expect(screen.getByText("Liked A")).toBeInTheDocument();
    expect(screen.getByText("2. Liked B")).toBeInTheDocument();
    expect(screen.getByText("3. Liked C")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /いいねが多い曲/ })).toHaveAttribute(
      "href",
      "/analytics/likes"
    );
  });

  it("hides the likes card when there are no likes", async () => {
    mockFetchTrackUsage.mockResolvedValue([{ title: "Song A", artist: "", count: 1 }]);
    mockFetchLikes.mockResolvedValue([]);

    renderWithProviders(<AnalyticsPage />);

    await screen.findByText("最多使用曲");
    expect(screen.queryByText("いいねが多い曲")).not.toBeInTheDocument();
  });

  it("hides the usage card when there are no tracks", async () => {
    mockFetchTrackUsage.mockResolvedValue([]);

    renderWithProviders(<AnalyticsPage />);

    await screen.findByText("総表示回数");
    expect(screen.queryByText("最多使用曲")).not.toBeInTheDocument();
  });

  it("shows an error message when loading fails", async () => {
    mockFetchTrackUsage.mockRejectedValue(new Error("boom"));

    renderWithProviders(<AnalyticsPage />);

    expect(await screen.findByText("boom")).toBeInTheDocument();
  });

  it("shows a generic message when the failure is not an Error", async () => {
    mockFetchTrackUsage.mockRejectedValue("network down");

    renderWithProviders(<AnalyticsPage />);

    expect(await screen.findByText("エラーが発生しました")).toBeInTheDocument();
  });
});
