import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, within, userEvent } from "../../../test-utils";
import { VocadbSearch } from "./VocadbSearch";
import { searchVocadbSongs } from "../api";
import { toast } from "sonner";

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return { ...actual, searchVocadbSongs: vi.fn() };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockSearch = vi.mocked(searchVocadbSongs);
const mockOnAdd = vi.fn();

const TELL_YOUR_WORLD = {
  id: 3939,
  title: "Tell Your World",
  artist: "kz feat. 初音ミク",
  songLink: "https://youtu.be/original000",
  vocadbUrl: "https://vocadb.net/S/3939",
  songType: "Original",
};

const NICO_ONLY_SONG = {
  id: 200,
  title: "ニコニコだけの曲",
  artist: "だれか",
  songLink: "https://www.nicovideo.jp/watch/sm1",
  vocadbUrl: "https://vocadb.net/S/200",
  songType: "Original",
};

const NO_LINK_SONG = {
  id: 100,
  title: "リンクなしの曲",
  artist: "だれか",
  songLink: "",
  vocadbUrl: "https://vocadb.net/S/100",
  songType: "Original",
};

const KZ = { id: 77, name: "kz", artistType: "Producer" };
const KZLABO = { id: 78, name: "kzlabo", artistType: "Circle" };

function result(over: Partial<Awaited<ReturnType<typeof searchVocadbSongs>>> = {}) {
  return { songs: [], artist: null, artistCandidates: [], ...over };
}

beforeEach(() => {
  mockSearch.mockReset();
  mockOnAdd.mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

async function open() {
  const user = userEvent.setup();
  renderWithProviders(<VocadbSearch onAdd={mockOnAdd} />);
  await user.click(screen.getByRole("button", { name: "VocaDBから検索" }));
  return user;
}

async function searchByTitle(term = "Tell Your World") {
  const user = await open();
  await user.type(screen.getByRole("searchbox", { name: "曲名" }), term);
  await user.click(screen.getByRole("button", { name: "検索" }));
  return user;
}

describe("VocadbSearch", () => {
  it("ボタンを押すと検索モーダルが開く", async () => {
    const user = userEvent.setup();
    renderWithProviders(<VocadbSearch onAdd={mockOnAdd} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "VocaDBから検索" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("曲名で検索し、曲名と作者名を一覧表示する", async () => {
    mockSearch.mockResolvedValue(result({ songs: [TELL_YOUR_WORLD] }));

    await searchByTitle();

    expect(mockSearch).toHaveBeenCalledWith({ title: "Tell Your World", artist: "" });
    const row = screen.getByRole("listitem");
    expect(within(row).getByText("Tell Your World")).toBeInTheDocument();
    expect(within(row).getByText("kz feat. 初音ミク")).toBeInTheDocument();
  });

  it("作者名だけでも検索できる", async () => {
    mockSearch.mockResolvedValue(result({ artist: KZ }));

    const user = await open();
    await user.type(screen.getByRole("searchbox", { name: "作者名" }), "kz");
    await user.click(screen.getByRole("button", { name: "検索" }));

    expect(mockSearch).toHaveBeenCalledWith({ title: "", artist: "kz" });
  });

  it("曲名と作者名を同時に指定して検索できる", async () => {
    mockSearch.mockResolvedValue(result({ songs: [TELL_YOUR_WORLD], artist: KZ }));

    const user = await open();
    await user.type(screen.getByRole("searchbox", { name: "曲名" }), "Tell");
    await user.type(screen.getByRole("searchbox", { name: "作者名" }), "kz");
    await user.click(screen.getByRole("button", { name: "検索" }));

    expect(mockSearch).toHaveBeenCalledWith({ title: "Tell", artist: "kz" });
  });

  it("どちらの欄も空なら検索しない", async () => {
    const user = await open();

    await user.click(screen.getByRole("button", { name: "検索" }));

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("採用された作者を表示する", async () => {
    mockSearch.mockResolvedValue(result({ songs: [TELL_YOUR_WORLD], artist: KZ }));

    const user = await open();
    await user.type(screen.getByRole("searchbox", { name: "作者名" }), "kz");
    await user.click(screen.getByRole("button", { name: "検索" }));

    expect(screen.getByText("kz")).toBeInTheDocument();
  });

  it("作者候補が複数あるとき、別の候補を選ぶとその作者で検索し直す", async () => {
    mockSearch.mockResolvedValue(
      result({ songs: [TELL_YOUR_WORLD], artist: KZ, artistCandidates: [KZ, KZLABO] })
    );

    const user = await open();
    await user.type(screen.getByRole("searchbox", { name: "作者名" }), "kz");
    await user.click(screen.getByRole("button", { name: "検索" }));

    await user.click(screen.getByRole("button", { name: "kzlabo" }));

    expect(mockSearch).toHaveBeenLastCalledWith({ title: "", artist: "kz", artistId: 78 });
  });

  it("候補が1人だけなら選び直しは出さない", async () => {
    mockSearch.mockResolvedValue(
      result({ songs: [TELL_YOUR_WORLD], artist: KZ, artistCandidates: [KZ] })
    );

    const user = await open();
    await user.type(screen.getByRole("searchbox", { name: "作者名" }), "kz");
    await user.click(screen.getByRole("button", { name: "検索" }));

    expect(screen.queryByText("別の作者で探す")).not.toBeInTheDocument();
  });

  it("作者が見つからなかったらその旨を表示する", async () => {
    mockSearch.mockResolvedValue(result());

    const user = await open();
    await user.type(screen.getByRole("searchbox", { name: "作者名" }), "該当なし");
    await user.click(screen.getByRole("button", { name: "検索" }));

    expect(screen.getByText("その作者は見つかりませんでした")).toBeInTheDocument();
  });

  it("結果を追加すると曲名・作者名・楽曲リンクの入ったトラックを渡す", async () => {
    mockSearch.mockResolvedValue(result({ songs: [TELL_YOUR_WORLD] }));

    const user = await searchByTitle();
    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(mockOnAdd).toHaveBeenCalledTimes(1);
    expect(mockOnAdd.mock.calls[0]![0]).toMatchObject({
      title: "Tell Your World",
      artist: "kz feat. 初音ミク",
      songLink: "https://youtu.be/original000",
    });
  });

  it("追加した曲は追加済みになり、二重に追加できない", async () => {
    mockSearch.mockResolvedValue(result({ songs: [TELL_YOUR_WORLD] }));

    const user = await searchByTitle();
    await user.click(screen.getByRole("button", { name: "追加" }));

    const addedButton = screen.getByRole("button", { name: "追加済み" });
    expect(addedButton).toBeDisabled();
    await user.click(addedButton);
    expect(mockOnAdd).toHaveBeenCalledTimes(1);
  });

  it("YouTube リンクのある結果はサムネイルを出し、動画ページへのリンクにする", async () => {
    mockSearch.mockResolvedValue(result({ songs: [TELL_YOUR_WORLD] }));

    await searchByTitle();

    const thumbnail = screen.getByRole("img", { name: "Tell Your World のサムネイル" });
    expect(thumbnail).toHaveAttribute("src", "/api/proxy/thumbnail?videoId=original000");
    expect(thumbnail.closest("a")).toHaveAttribute("href", "https://youtu.be/original000");
  });

  it("YouTube 以外のリンクしかない結果にはサムネイルを出さない", async () => {
    mockSearch.mockResolvedValue(result({ songs: [NICO_ONLY_SONG] }));

    await searchByTitle("ニコニコ");

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText("楽曲リンクなし")).not.toBeInTheDocument();
    expect(screen.getByText("ニコニコだけの曲")).toBeInTheDocument();
  });

  it("楽曲リンクが見つからなかった曲はその旨を表示する", async () => {
    mockSearch.mockResolvedValue(result({ songs: [NO_LINK_SONG] }));

    await searchByTitle("リンクなし");

    expect(screen.getByText("楽曲リンクなし")).toBeInTheDocument();
  });

  it("Original 以外の種別はバッジで示す", async () => {
    mockSearch.mockResolvedValue(result({ songs: [{ ...TELL_YOUR_WORLD, songType: "Remix" }] }));

    await searchByTitle();

    expect(screen.getByText("Remix")).toBeInTheDocument();
  });

  it("Original の種別はバッジを出さない", async () => {
    mockSearch.mockResolvedValue(result({ songs: [TELL_YOUR_WORLD] }));

    await searchByTitle();

    expect(screen.queryByText("Original")).not.toBeInTheDocument();
  });

  it("検索結果が0件ならその旨を表示する", async () => {
    mockSearch.mockResolvedValue(result());

    await searchByTitle("該当なし");

    expect(screen.getByText("見つかりませんでした")).toBeInTheDocument();
  });

  it("検索に失敗したらエラーを通知する", async () => {
    mockSearch.mockRejectedValue(new Error("VocaDBの検索に失敗しました"));

    await searchByTitle("テオ");

    expect(toast.error).toHaveBeenCalledWith("VocaDBの検索に失敗しました");
  });

  it("検索中は検索ボタンを押せない", async () => {
    let resolveSearch: (r: ReturnType<typeof result>) => void = () => {};
    mockSearch.mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve;
      })
    );

    await searchByTitle("テオ");

    expect(screen.getByRole("button", { name: "検索中..." })).toBeDisabled();

    resolveSearch(result());
    expect(await screen.findByText("見つかりませんでした")).toBeInTheDocument();
  });

  it("閉じると前回の検索結果も入力も残らない", async () => {
    mockSearch.mockResolvedValue(result({ songs: [TELL_YOUR_WORLD] }));

    const user = await searchByTitle();
    expect(screen.getByRole("listitem")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "閉じる" }));
    await user.click(screen.getByRole("button", { name: "VocaDBから検索" }));

    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "曲名" })).toHaveValue("");
    expect(screen.getByRole("searchbox", { name: "作者名" })).toHaveValue("");
  });
});
