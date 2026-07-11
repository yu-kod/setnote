import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, waitFor } from "../test-utils";
import SetlistPage from "./SetlistPage";
import { fetchPublicSetlist } from "../features/setlist/api";
import type { Setlist } from "../features/setlist/types";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useParams: () => ({ id: "abc123" }) };
});

vi.mock("../features/setlist/api", () => ({
  fetchPublicSetlist: vi.fn(),
}));

const mockFetch = vi.mocked(fetchPublicSetlist);

function buildPublicSetlist(overrides: Partial<Setlist> = {}): Setlist {
  return {
    id: "abc123",
    userId: "u1",
    name: "My Set",
    artistName: null,
    eventName: null,
    eventLink: null,
    eventDate: null,
    tracks: [],
    status: "published",
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("SetlistPage", () => {
  it("shows a loading skeleton while fetching", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<SetlistPage />);

    expect(screen.getByRole("status", { name: "読み込み中" })).toBeInTheDocument();
  });

  it("renders the not-found page when the setlist is not public", async () => {
    mockFetch.mockRejectedValue(new Error("Not found"));
    renderWithProviders(<SetlistPage />);

    await waitFor(() => {
      expect(screen.getByText("お探しのページが見つかりませんでした")).toBeInTheDocument();
    });
  });

  it("renders the setlist with event info and tracks", async () => {
    mockFetch.mockResolvedValue(
      buildPublicSetlist({
        name: "Summer Set",
        artistName: "DJ Star",
        eventName: "Summer Fes",
        eventLink: "https://fes.example.com",
        eventDate: "2026-08-01",
        tracks: [
          {
            id: "t1",
            title: "Song A",
            artist: "DJ X",
            songLink: "https://youtu.be/1",
            source: "https://shop.example.com",
            customFields: [{ id: "c1", label: "BPM", value: "128" }],
          },
          {
            id: "t2",
            title: "Song B",
            artist: "",
            songLink: "",
            source: "レコード店で購入",
            customFields: [],
          },
        ],
      })
    );
    renderWithProviders(<SetlistPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Summer Set" })).toBeInTheDocument();
    });
    expect(screen.getByText("by DJ Star")).toBeInTheDocument();
    expect(screen.getByText("Summer Fes")).toBeInTheDocument();
    expect(screen.getByText("2026/8/1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "イベントページ" })).toHaveAttribute(
      "href",
      "https://fes.example.com"
    );

    expect(screen.getByText("Song A")).toBeInTheDocument();
    expect(screen.getByText("DJ X")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "再生・リンク" })).toHaveAttribute(
      "href",
      "https://youtu.be/1"
    );
    // ソースが URL のときはリンク
    expect(screen.getByRole("link", { name: "入手元" })).toHaveAttribute(
      "href",
      "https://shop.example.com"
    );
    expect(screen.getByText("BPM: 128")).toBeInTheDocument();
    // ソースが自由文のときはテキスト
    expect(screen.getByText("入手元: レコード店で購入")).toBeInTheDocument();
    expect(screen.getByText("Song B")).toBeInTheDocument();
  });

  it("renders a minimal setlist without event info or optional track fields", async () => {
    mockFetch.mockResolvedValue(
      buildPublicSetlist({
        name: "Bare",
        tracks: [
          { id: "t3", title: "Solo", artist: "", songLink: "", source: "", customFields: [] },
        ],
      })
    );
    renderWithProviders(<SetlistPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Bare" })).toBeInTheDocument();
    });
    expect(screen.getByText("Solo")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "イベントページ" })).not.toBeInTheDocument();
  });
});
