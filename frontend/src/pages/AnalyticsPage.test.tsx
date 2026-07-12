import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, within } from "../test-utils";
import AnalyticsPage from "./AnalyticsPage";
import { fetchTrackUsage } from "../features/analytics/api";
import { fetchMySetlists } from "../features/setlist/api";

vi.mock("../features/analytics/api", () => ({
  fetchTrackUsage: vi.fn(),
}));

vi.mock("../features/setlist/api", () => ({
  fetchMySetlists: vi.fn(),
}));

const mockFetchTrackUsage = vi.mocked(fetchTrackUsage);
const mockFetchMySetlists = vi.mocked(fetchMySetlists);

beforeEach(() => {
  mockFetchTrackUsage.mockReset();
  mockFetchMySetlists.mockReset();
  mockFetchMySetlists.mockResolvedValue([]);
});

describe("AnalyticsPage (overview)", () => {
  it("shows KPI numbers, the top song, and a top-songs chart after loading", async () => {
    mockFetchTrackUsage.mockResolvedValue([
      { title: "Song A", artist: "DJ X", count: 5 },
      { title: "Song B", artist: "", count: 2 },
    ]);
    mockFetchMySetlists.mockResolvedValue([{ id: "1" }, { id: "2" }, { id: "3" }] as never);

    renderWithProviders(<AnalyticsPage />);

    // 最多演奏曲のヒーロー
    const hero = (await screen.findByText("最多演奏曲")).parentElement as HTMLElement;
    expect(within(hero).getByText("Song A")).toBeInTheDocument();

    // KPI: セットリスト数 3, ユニーク曲 2, 総演奏回数 7
    expect(screen.getByText("セットリスト").previousSibling).toHaveTextContent("3");
    expect(screen.getByText("ユニーク曲").previousSibling).toHaveTextContent("2");
    expect(screen.getByText("総演奏回数").previousSibling).toHaveTextContent("7");

    // Top曲チャートに曲名が並ぶ
    expect(screen.getByText("Song B")).toBeInTheDocument();
  });

  it("links to the full track list", async () => {
    mockFetchTrackUsage.mockResolvedValue([]);

    renderWithProviders(<AnalyticsPage />);

    const link = await screen.findByRole("link", { name: /すべての曲を見る/ });
    expect(link).toHaveAttribute("href", "/analytics/tracks");
  });

  it("shows an empty chart message when there is no usage data", async () => {
    mockFetchTrackUsage.mockResolvedValue([]);

    renderWithProviders(<AnalyticsPage />);

    expect(await screen.findByText(/まだ.*ありません/)).toBeInTheDocument();
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

  it("shows a loading indicator before data arrives", () => {
    mockFetchTrackUsage.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<AnalyticsPage />);

    expect(screen.getByRole("status", { name: "読み込み中" })).toBeInTheDocument();
  });
});
