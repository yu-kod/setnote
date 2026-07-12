import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen } from "../test-utils";
import AnalyticsTracksPage from "./AnalyticsTracksPage";
import { fetchTrackUsage } from "../features/analytics/api";

vi.mock("../features/analytics/api", () => ({
  fetchTrackUsage: vi.fn(),
}));

const mockFetchTrackUsage = vi.mocked(fetchTrackUsage);

beforeEach(() => {
  mockFetchTrackUsage.mockReset();
});

describe("AnalyticsTracksPage", () => {
  it("shows the full track-usage ranking after loading", async () => {
    mockFetchTrackUsage.mockResolvedValue([
      { title: "Song A", artist: "DJ X", count: 3 },
      { title: "Song B", artist: "", count: 1 },
    ]);

    renderWithProviders(<AnalyticsTracksPage />);

    expect(await screen.findByText("Song A")).toBeInTheDocument();
    expect(screen.getByText("DJ X")).toBeInTheDocument();
    expect(screen.getByText("Song B")).toBeInTheDocument();
    expect(screen.getByText("3回")).toBeInTheDocument();
    expect(screen.getByText("1回")).toBeInTheDocument();
  });

  it("links back to the analytics overview", async () => {
    mockFetchTrackUsage.mockResolvedValue([]);

    renderWithProviders(<AnalyticsTracksPage />);

    const back = await screen.findByRole("link", { name: /分析トップ/ });
    expect(back).toHaveAttribute("href", "/analytics");
  });

  it("shows an empty state when there is no usage data", async () => {
    mockFetchTrackUsage.mockResolvedValue([]);

    renderWithProviders(<AnalyticsTracksPage />);

    expect(await screen.findByText(/まだ.*ありません/)).toBeInTheDocument();
  });

  it("shows an error message when loading fails", async () => {
    mockFetchTrackUsage.mockRejectedValue(new Error("boom"));

    renderWithProviders(<AnalyticsTracksPage />);

    expect(await screen.findByText("boom")).toBeInTheDocument();
  });

  it("shows a generic message when the failure is not an Error", async () => {
    mockFetchTrackUsage.mockRejectedValue("network down");

    renderWithProviders(<AnalyticsTracksPage />);

    expect(await screen.findByText("エラーが発生しました")).toBeInTheDocument();
  });

  it("shows a loading indicator before data arrives", () => {
    mockFetchTrackUsage.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<AnalyticsTracksPage />);

    expect(screen.getByRole("status", { name: "読み込み中" })).toBeInTheDocument();
  });
});
