import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen } from "../test-utils";
import AnalyticsPage from "./AnalyticsPage";
import { fetchTrackUsage } from "../features/analytics/api";

vi.mock("../features/analytics/api", () => ({
  fetchTrackUsage: vi.fn(),
}));

const mockFetchTrackUsage = vi.mocked(fetchTrackUsage);

beforeEach(() => {
  mockFetchTrackUsage.mockReset();
});

describe("AnalyticsPage", () => {
  it("shows the track-usage ranking after loading", async () => {
    mockFetchTrackUsage.mockResolvedValue([
      { title: "Song A", artist: "DJ X", count: 3 },
      { title: "Song B", artist: "", count: 1 },
    ]);

    renderWithProviders(<AnalyticsPage />);

    expect(await screen.findByText("Song A")).toBeInTheDocument();
    expect(screen.getByText("DJ X")).toBeInTheDocument();
    expect(screen.getByText("Song B")).toBeInTheDocument();
    // 使用回数が表示される
    expect(screen.getByText("3回")).toBeInTheDocument();
    expect(screen.getByText("1回")).toBeInTheDocument();
  });

  it("shows an empty state when there is no usage data", async () => {
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
