import { describe, it, expect, vi, beforeEach } from "vitest";
import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, screen, waitFor } from "../test-utils";
import SetlistPage from "./SetlistPage";
import {
  fetchPublicSetlist,
  recordSetlistView,
  likeTrack,
  unlikeTrack,
} from "../features/setlist/api";
import type { Setlist } from "../features/setlist/types";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useParams: () => ({ id: "abc123" }) };
});

vi.mock("../features/setlist/api", () => ({
  fetchPublicSetlist: vi.fn(),
  recordSetlistView: vi.fn(),
  likeTrack: vi.fn(),
  unlikeTrack: vi.fn(),
}));

const mockFetch = vi.mocked(fetchPublicSetlist);
const mockRecordView = vi.mocked(recordSetlistView);
const mockLikeTrack = vi.mocked(likeTrack);
const mockUnlikeTrack = vi.mocked(unlikeTrack);

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
  mockRecordView.mockReset();
  mockLikeTrack.mockReset();
  mockUnlikeTrack.mockReset();
  localStorage.clear();
  // jsdom は scrollIntoView 未実装のためモックする。
  Element.prototype.scrollIntoView = vi.fn();
});

function buildLikableSetlist() {
  return buildPublicSetlist({
    tracks: [{ id: "t1", title: "Song A", artist: "", songLink: "", source: "", customFields: [] }],
    likeCounts: { t1: 2 },
  });
}

// 目次の「選択」ボタン（いいねボタンと曲名が被るため「いいね」を除外して特定する）。
function selectButton(title: string) {
  return screen.getByRole("button", {
    name: (name) => name.includes(title) && !name.includes("いいね"),
  });
}

// 曲のいいねボタン。
function likeButton(title: string) {
  return screen.getByRole("button", { name: `${title}にいいね` });
}

describe("SetlistPage", () => {
  it("shows a loading skeleton while fetching", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<SetlistPage />);

    expect(screen.getByRole("status", { name: "読み込み中" })).toBeInTheDocument();
  });

  it("records a view beacon for the setlist on mount", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<SetlistPage />);

    expect(mockRecordView).toHaveBeenCalledWith("abc123");
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
    expect(screen.getByText("2026/8/1")).toBeInTheDocument();
    // イベント名自体がリンクになっている
    expect(screen.getByRole("link", { name: "Summer Fes" })).toHaveAttribute(
      "href",
      "https://fes.example.com"
    );

    // 目次に全曲が並ぶ
    expect(selectButton("Song A")).toBeInTheDocument();
    expect(selectButton("Song B")).toBeInTheDocument();

    // 初期表示は先頭曲(t1)のプレイヤーが開いている（曲名・作者・埋め込み・詳細）
    const player = within(screen.getByRole("region", { name: "選択中の曲" }));
    expect(player.getByText("Song A")).toBeInTheDocument();
    expect(player.getByText("DJ X")).toBeInTheDocument();
    expect(player.getByTitle("YouTube").getAttribute("src")).toContain(
      "youtube.com/embed/dQw4w9WgXcQ"
    );
    expect(player.getByRole("link", { name: "入手元" })).toHaveAttribute(
      "href",
      "https://shop.example.com"
    );
    expect(player.getByText("BPM: 128")).toBeInTheDocument();
    // t2 の情報はまだ表示されない
    expect(screen.queryByText("入手元: レコード店で購入")).not.toBeInTheDocument();

    // 2曲目を選ぶとプレイヤーが切り替わる
    await user.click(selectButton("Song B"));

    const player2 = within(screen.getByRole("region", { name: "選択中の曲" }));
    expect(player2.getByText("Song B")).toBeInTheDocument();
    expect(screen.queryByTitle("YouTube")).not.toBeInTheDocument();
    // 未対応リンクはフォールバックのリンク表示
    expect(player2.getByRole("link", { name: "再生・リンク" })).toHaveAttribute(
      "href",
      "https://example.com/track"
    );
    // ソースが自由文のときはテキスト
    expect(player2.getByText("入手元: レコード店で購入")).toBeInTheDocument();
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
    expect(selectButton("Solo")).toBeInTheDocument();
    expect(screen.getByText("再生リンクはありません")).toBeInTheDocument();
  });

  it("shows the event name as plain text when there is no event link", async () => {
    mockFetch.mockResolvedValue(
      buildPublicSetlist({
        name: "Set",
        eventName: "Club Night",
        tracks: [{ id: "t9", title: "X", artist: "", songLink: "", source: "", customFields: [] }],
      })
    );
    renderWithProviders(<SetlistPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Set" })).toBeInTheDocument();
    });
    expect(screen.getByText("Club Night")).toBeInTheDocument();
    // リンクが無いのでリンク化されない
    expect(screen.queryByRole("link", { name: "Club Night" })).not.toBeInTheDocument();
  });

  it("shows an empty message when the setlist has no tracks", async () => {
    mockFetch.mockResolvedValue(buildPublicSetlist({ name: "Empty", tracks: [] }));
    renderWithProviders(<SetlistPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Empty" })).toBeInTheDocument();
    });
    expect(screen.getByText("曲がまだありません")).toBeInTheDocument();
  });

  it("shows the like count and lets a viewer like a track", async () => {
    mockFetch.mockResolvedValue(buildLikableSetlist());
    mockLikeTrack.mockResolvedValue(3);
    const user = userEvent.setup();
    renderWithProviders(<SetlistPage />);

    const button = await screen.findByRole("button", { name: "Song Aにいいね" });
    expect(within(button).getByText("2")).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);

    expect(mockLikeTrack).toHaveBeenCalledWith("abc123", "t1");
    expect(within(likeButton("Song A")).getByText("3")).toBeInTheDocument();
    // いいね済みの状態になる（取り消しできるよう有効なまま）
    expect(likeButton("Song A")).toHaveAttribute("aria-pressed", "true");
    expect(likeButton("Song A")).toBeEnabled();
  });

  it("lets a viewer undo a like on an already-liked track", async () => {
    localStorage.setItem("setnote_liked_abc123", JSON.stringify(["t1"]));
    mockFetch.mockResolvedValue(buildLikableSetlist());
    mockUnlikeTrack.mockResolvedValue(1);
    const user = userEvent.setup();
    renderWithProviders(<SetlistPage />);

    const button = await screen.findByRole("button", { name: "Song Aにいいね" });
    expect(button).toHaveAttribute("aria-pressed", "true");

    await user.click(button);

    expect(mockUnlikeTrack).toHaveBeenCalledWith("abc123", "t1");
    expect(mockLikeTrack).not.toHaveBeenCalled();
    expect(within(likeButton("Song A")).getByText("1")).toBeInTheDocument();
    expect(likeButton("Song A")).toHaveAttribute("aria-pressed", "false");
  });
});
