import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
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
  // jsdom は scrollIntoView 未実装のためモックする。
  Element.prototype.scrollIntoView = vi.fn();
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

  it("lists all tracks, opens the first track's player, and switches on selection", async () => {
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
            songLink: "https://youtu.be/dQw4w9WgXcQ",
            source: "https://shop.example.com",
            customFields: [{ id: "c1", label: "BPM", value: "128" }],
          },
          {
            id: "t2",
            title: "Song B",
            artist: "",
            songLink: "https://example.com/track",
            source: "レコード店で購入",
            customFields: [],
          },
        ],
      })
    );
    const user = userEvent.setup();
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

    // 目次に全曲が並ぶ
    expect(screen.getByText("Song A")).toBeInTheDocument();
    expect(screen.getByText("Song B")).toBeInTheDocument();

    // 初期表示は先頭曲(t1)のプレイヤーが開いている
    expect(screen.getByTitle("YouTube").getAttribute("src")).toContain(
      "youtube.com/embed/dQw4w9WgXcQ"
    );
    expect(screen.getByRole("link", { name: "入手元" })).toHaveAttribute(
      "href",
      "https://shop.example.com"
    );
    expect(screen.getByText("BPM: 128")).toBeInTheDocument();
    // t2 の情報はまだ表示されない
    expect(screen.queryByText("入手元: レコード店で購入")).not.toBeInTheDocument();

    // 2曲目を選ぶとプレイヤーが切り替わる
    await user.click(screen.getByRole("button", { name: /Song B/ }));

    expect(screen.queryByTitle("YouTube")).not.toBeInTheDocument();
    // 未対応リンクはフォールバックのリンク表示
    expect(screen.getByRole("link", { name: "再生・リンク" })).toHaveAttribute(
      "href",
      "https://example.com/track"
    );
    // ソースが自由文のときはテキスト
    expect(screen.getByText("入手元: レコード店で購入")).toBeInTheDocument();
    expect(screen.queryByText("BPM: 128")).not.toBeInTheDocument();
    // 下のプレイヤーが画面内に寄せられる
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("shows a no-link message for a track without a song link", async () => {
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
    expect(screen.getByText("再生リンクはありません")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "イベントページ" })).not.toBeInTheDocument();
  });

  it("shows an empty message when the setlist has no tracks", async () => {
    mockFetch.mockResolvedValue(buildPublicSetlist({ name: "Empty", tracks: [] }));
    renderWithProviders(<SetlistPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Empty" })).toBeInTheDocument();
    });
    expect(screen.getByText("曲がまだありません")).toBeInTheDocument();
  });
});
