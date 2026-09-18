import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, within } from "@testing-library/react";
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
    tracks: [
      {
        id: "t1",
        title: "Song A",
        artist: "",
        songLink: "",
        source: "",
        customFields: [],
        groupId: null,
      },
    ],
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
            groupId: null,
          },
          {
            id: "t2",
            title: "Song B",
            artist: "",
            songLink: "https://example.com/track",
            source: "レコード店で購入",
            customFields: [],
            groupId: null,
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
          {
            id: "t3",
            title: "Solo",
            artist: "",
            songLink: "",
            source: "",
            customFields: [],
            groupId: null,
          },
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
        tracks: [
          {
            id: "t9",
            title: "X",
            artist: "",
            songLink: "",
            source: "",
            customFields: [],
            groupId: null,
          },
        ],
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

  it("displays grouped tracks under the same number in the track list", async () => {
    mockFetch.mockResolvedValue(
      buildPublicSetlist({
        name: "Grouped",
        tracks: [
          {
            id: "t1",
            title: "Solo",
            artist: "A",
            songLink: "",
            source: "",
            customFields: [],
            groupId: null,
          },
          {
            id: "t2",
            title: "Blend A",
            artist: "B",
            songLink: "",
            source: "",
            customFields: [],
            groupId: "g1",
          },
          {
            id: "t3",
            title: "Blend B",
            artist: "C",
            songLink: "",
            source: "",
            customFields: [],
            groupId: "g1",
          },
          {
            id: "t4",
            title: "Closer",
            artist: "D",
            songLink: "",
            source: "",
            customFields: [],
            groupId: null,
          },
        ],
      })
    );
    renderWithProviders(<SetlistPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Grouped" })).toBeInTheDocument();
    });

    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("1.")).toBeInTheDocument();
    expect(within(items[1]).getByText("2.")).toBeInTheDocument();
    expect(within(items[2]).getByText("2.")).toBeInTheDocument();
    expect(within(items[3]).getByText("3.")).toBeInTheDocument();

    // 結合された2曲目にBLENDマークが表示される
    expect(within(items[2]).getByText("BLEND")).toBeInTheDocument();
    // 結合グループの先頭にはBLENDマークは付かない
    expect(within(items[1]).queryByText("BLEND")).not.toBeInTheDocument();
  });

  it("shows both tracks in the player when a grouped track is selected", async () => {
    mockFetch.mockResolvedValue(
      buildPublicSetlist({
        name: "Grouped",
        tracks: [
          {
            id: "t1",
            title: "Solo",
            artist: "",
            songLink: "",
            source: "",
            customFields: [],
            groupId: null,
          },
          {
            id: "t2",
            title: "Blend A",
            artist: "B",
            songLink: "",
            source: "",
            customFields: [],
            groupId: "g1",
          },
          {
            id: "t3",
            title: "Blend B",
            artist: "C",
            songLink: "",
            source: "",
            customFields: [],
            groupId: "g1",
          },
        ],
      })
    );
    const user = userEvent.setup();
    renderWithProviders(<SetlistPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Grouped" })).toBeInTheDocument();
    });

    await user.click(selectButton("Blend A"));

    const player = within(screen.getByRole("region", { name: "選択中の曲" }));
    expect(player.getByText("Blend A")).toBeInTheDocument();
    expect(player.getByText("Blend B")).toBeInTheDocument();
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

describe("SetlistPage サムネイル", () => {
  function buildSetlistWithLinks() {
    return buildPublicSetlist({
      tracks: [
        {
          id: "t1",
          title: "YouTube Song",
          artist: "",
          songLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          source: "",
          customFields: [],
          groupId: null,
        },
        {
          id: "t2",
          title: "Spotify Song",
          artist: "",
          songLink: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
          source: "",
          customFields: [],
          groupId: null,
        },
        {
          id: "t3",
          title: "No Link Song",
          artist: "",
          songLink: "",
          source: "",
          customFields: [],
          groupId: null,
        },
      ],
    });
  }

  it("YouTube リンクのトラックにサムネイルを表示する", async () => {
    mockFetch.mockResolvedValue(buildSetlistWithLinks());
    renderWithProviders(<SetlistPage />);

    const thumbnail = await screen.findByRole("img", { name: "YouTube Song のサムネイル" });
    expect(thumbnail).toHaveAttribute("src", "/api/proxy/thumbnail?videoId=dQw4w9WgXcQ");
  });

  it("サムネイルから YouTube の動画ページへリンクする", async () => {
    mockFetch.mockResolvedValue(buildSetlistWithLinks());
    renderWithProviders(<SetlistPage />);

    const link = await screen.findByRole("link", { name: "YouTube Song のサムネイル" });
    expect(link).toHaveAttribute("href", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("YouTube 以外のリンクではサムネイルを表示しない", async () => {
    mockFetch.mockResolvedValue(buildSetlistWithLinks());
    renderWithProviders(<SetlistPage />);

    await screen.findByRole("img", { name: "YouTube Song のサムネイル" });
    expect(
      screen.queryByRole("img", { name: "Spotify Song のサムネイル" })
    ).not.toBeInTheDocument();
  });

  it("リンクのないトラックではサムネイルを表示しない", async () => {
    mockFetch.mockResolvedValue(buildSetlistWithLinks());
    renderWithProviders(<SetlistPage />);

    await screen.findByRole("img", { name: "YouTube Song のサムネイル" });
    expect(
      screen.queryByRole("img", { name: "No Link Song のサムネイル" })
    ).not.toBeInTheDocument();
  });
});

describe("SetlistPage 一覧表示", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  function buildSetlistForList() {
    return buildPublicSetlist({
      tracks: [
        {
          id: "t1",
          title: "Song A",
          artist: "Artist A",
          songLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          source: "",
          customFields: [],
          groupId: null,
        },
        {
          id: "t2",
          title: "Song B",
          artist: "",
          songLink: "",
          source: "",
          customFields: [],
          groupId: null,
        },
      ],
      likeCounts: { t1: 3 },
    });
  }

  // 一覧表示に入ると戻り方の案内モーダルが出るため、閉じてから中身を検証する。
  async function renderAndToggle() {
    await renderAndOpenGuide();
    await userEvent.click(screen.getByRole("button", { name: "閉じる" }));
  }

  async function renderAndOpenGuide() {
    mockFetch.mockResolvedValue(buildSetlistForList());
    renderWithProviders(<SetlistPage />);
    await userEvent.click(await screen.findByRole("button", { name: "一覧表示" }));
  }

  it("一覧表示のトグルを表示する", async () => {
    mockFetch.mockResolvedValue(buildSetlistForList());
    renderWithProviders(<SetlistPage />);

    expect(await screen.findByRole("button", { name: "一覧表示" })).toBeInTheDocument();
  });

  it("一覧表示にするとプレイヤーを隠す", async () => {
    await renderAndToggle();

    expect(screen.queryByRole("region", { name: "選択中の曲" })).not.toBeInTheDocument();
  });

  it("一覧表示にするといいねボタンを隠す", async () => {
    await renderAndToggle();

    expect(screen.queryByRole("button", { name: "Song Aにいいね" })).not.toBeInTheDocument();
  });

  it("一覧表示でも曲名とサムネイルは残る", async () => {
    await renderAndToggle();

    expect(screen.getByText("Song A")).toBeInTheDocument();
    expect(screen.getByText("Song B")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Song A のサムネイル" })).toBeInTheDocument();
  });

  // スクリーンショットに写り込まないよう、一覧表示中はトグル自体を消す。
  it("一覧表示ではトグルボタンを表示しない", async () => {
    await renderAndToggle();

    expect(screen.queryByRole("button", { name: "一覧表示" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "通常表示" })).not.toBeInTheDocument();
  });

  it("一覧表示は URL に残るため、リロードしても一覧表示で開く", async () => {
    window.history.replaceState({}, "", "/?view=list");
    mockFetch.mockResolvedValue(buildSetlistForList());
    renderWithProviders(<SetlistPage />);

    await screen.findByText("Song A");
    expect(screen.queryByRole("region", { name: "選択中の曲" })).not.toBeInTheDocument();
  });

  // 戻り方が分からなくなると詰むため、見落とされない形（モーダル）で案内する。
  it("一覧表示にすると戻り方の案内をモーダルで出す", async () => {
    await renderAndOpenGuide();

    const dialog = await screen.findByRole("dialog", { name: "一覧表示にしました" });
    expect(dialog).toHaveTextContent("ブラウザの戻る");
  });

  // 一覧表示はスクショして共有するための表示なので、スクロールが出たら意味がない。
  it("画面の高さと曲数から行の高さを決める", async () => {
    const rect = vi
      .spyOn(Element.prototype, "getBoundingClientRect")
      .mockReturnValue({ top: 120 } as DOMRect);
    const originalHeight = window.innerHeight;
    window.innerHeight = 400;
    try {
      mockFetch.mockResolvedValue(
        buildPublicSetlist({
          tracks: Array.from({ length: 10 }, (_, i) => ({
            id: `t${i}`,
            title: `Song ${i}`,
            artist: "",
            songLink: "",
            source: "",
            customFields: [],
            groupId: null,
          })),
        })
      );
      window.history.replaceState({}, "", "/?view=list");
      renderWithProviders(<SetlistPage />);
      await userEvent.click(await screen.findByRole("button", { name: "閉じる" }));

      // 使える高さ = 400 - 上端120 - 余白8 = 272。10曲なので1行27px。
      const rows = screen.getAllByRole("listitem");
      expect(rows[0]).toHaveStyle({ height: "27px" });

      // 画面が変われば測り直す（回転やアドレスバーの出入り）。
      window.innerHeight = 800;
      await act(async () => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(screen.getAllByRole("listitem")[0]).toHaveStyle({ height: "36px" });
    } finally {
      window.innerHeight = originalHeight;
      rect.mockRestore();
    }
  });

  it("案内を閉じるとモーダルが消える", async () => {
    await renderAndOpenGuide();
    await screen.findByRole("dialog", { name: "一覧表示にしました" });

    await userEvent.click(screen.getByRole("button", { name: "閉じる" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
