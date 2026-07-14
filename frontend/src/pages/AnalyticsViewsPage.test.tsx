import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen } from "../test-utils";
import AnalyticsViewsPage from "./AnalyticsViewsPage";
import { fetchViews } from "../features/analytics/api";

vi.mock("../features/analytics/api", () => ({
  fetchViews: vi.fn(),
}));

const mockFetchViews = vi.mocked(fetchViews);

beforeEach(() => {
  mockFetchViews.mockReset();
});

describe("AnalyticsViewsPage", () => {
  it("shows the full view-count ranking after loading", async () => {
    mockFetchViews.mockResolvedValue([
      { id: "s1", name: "Summer Set", viewCount: 120 },
      { id: "s2", name: "Winter Set", viewCount: 45 },
    ]);

    renderWithProviders(<AnalyticsViewsPage />);

    expect(await screen.findByText("Summer Set")).toBeInTheDocument();
    expect(screen.getByText("Winter Set")).toBeInTheDocument();
    expect(screen.getByText("120回")).toBeInTheDocument();
    expect(screen.getByText("45回")).toBeInTheDocument();
  });

  it("links back to the analytics overview", async () => {
    mockFetchViews.mockResolvedValue([]);

    renderWithProviders(<AnalyticsViewsPage />);

    const back = await screen.findByRole("link", { name: /分析トップ/ });
    expect(back).toHaveAttribute("href", "/analytics");
  });

  it("shows an empty state when there is no view data", async () => {
    mockFetchViews.mockResolvedValue([]);

    renderWithProviders(<AnalyticsViewsPage />);

    expect(await screen.findByText(/まだ.*ありません/)).toBeInTheDocument();
  });

  it("shows an error message when loading fails", async () => {
    mockFetchViews.mockRejectedValue(new Error("boom"));

    renderWithProviders(<AnalyticsViewsPage />);

    expect(await screen.findByText("boom")).toBeInTheDocument();
  });

  it("shows a generic message when the failure is not an Error", async () => {
    mockFetchViews.mockRejectedValue("network down");

    renderWithProviders(<AnalyticsViewsPage />);

    expect(await screen.findByText("エラーが発生しました")).toBeInTheDocument();
  });

  it("shows a loading indicator before data arrives", () => {
    mockFetchViews.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<AnalyticsViewsPage />);

    expect(screen.getByRole("status", { name: "読み込み中" })).toBeInTheDocument();
  });

  it("displays rank numbers in order", async () => {
    mockFetchViews.mockResolvedValue([
      { id: "s1", name: "Set A", viewCount: 100 },
      { id: "s2", name: "Set B", viewCount: 50 },
      { id: "s3", name: "Set C", viewCount: 10 },
    ]);

    renderWithProviders(<AnalyticsViewsPage />);

    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(3);
  });
});
