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
};

const NO_LINK_SONG = {
  id: 100,
  title: "リンクなしの曲",
  artist: "だれか",
  songLink: "",
  vocadbUrl: "https://vocadb.net/S/100",
};

beforeEach(() => {
  mockSearch.mockReset();
  mockOnAdd.mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

async function openAndSearch(term = "Tell Your World") {
  const user = userEvent.setup();
  renderWithProviders(<VocadbSearch onAdd={mockOnAdd} />);
  await user.click(screen.getByRole("button", { name: "VocaDBから検索" }));
  await user.type(screen.getByRole("searchbox", { name: "検索語" }), term);
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
    mockSearch.mockResolvedValue([TELL_YOUR_WORLD]);

    await openAndSearch();

    expect(mockSearch).toHaveBeenCalledWith("Tell Your World", "title");
    const result = screen.getByRole("listitem");
    expect(within(result).getByText("Tell Your World")).toBeInTheDocument();
    expect(within(result).getByText("kz feat. 初音ミク")).toBeInTheDocument();
  });

  it("作者名に切り替えると作者名で検索する", async () => {
    mockSearch.mockResolvedValue([]);
    const user = userEvent.setup();
    renderWithProviders(<VocadbSearch onAdd={mockOnAdd} />);

    await user.click(screen.getByRole("button", { name: "VocaDBから検索" }));
    await user.click(screen.getByRole("radio", { name: "作者名" }));
    await user.type(screen.getByRole("searchbox", { name: "検索語" }), "kz");
    await user.click(screen.getByRole("button", { name: "検索" }));

    expect(mockSearch).toHaveBeenCalledWith("kz", "artist");
  });

  it("結果を追加すると曲名・作者名・楽曲リンクの入ったトラックを渡す", async () => {
    mockSearch.mockResolvedValue([TELL_YOUR_WORLD]);

    const user = await openAndSearch();
    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(mockOnAdd).toHaveBeenCalledTimes(1);
    expect(mockOnAdd.mock.calls[0]![0]).toMatchObject({
      title: "Tell Your World",
      artist: "kz feat. 初音ミク",
      songLink: "https://youtu.be/original000",
    });
  });

  it("追加した曲は追加済みになり、二重に追加できない", async () => {
    mockSearch.mockResolvedValue([TELL_YOUR_WORLD]);

    const user = await openAndSearch();
    await user.click(screen.getByRole("button", { name: "追加" }));

    const addedButton = screen.getByRole("button", { name: "追加済み" });
    expect(addedButton).toBeDisabled();
    await user.click(addedButton);
    expect(mockOnAdd).toHaveBeenCalledTimes(1);
  });

  it("楽曲リンクが見つからなかった曲はその旨を表示する", async () => {
    mockSearch.mockResolvedValue([NO_LINK_SONG]);

    await openAndSearch("リンクなし");

    expect(screen.getByText("楽曲リンクなし")).toBeInTheDocument();
  });

  it("検索結果が0件ならその旨を表示する", async () => {
    mockSearch.mockResolvedValue([]);

    await openAndSearch("該当なし");

    expect(screen.getByText("見つかりませんでした")).toBeInTheDocument();
  });

  it("検索語が空のまま検索しても VocaDB を呼ばない", async () => {
    const user = userEvent.setup();
    renderWithProviders(<VocadbSearch onAdd={mockOnAdd} />);

    await user.click(screen.getByRole("button", { name: "VocaDBから検索" }));
    await user.click(screen.getByRole("button", { name: "検索" }));

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("検索に失敗したらエラーを通知する", async () => {
    mockSearch.mockRejectedValue(new Error("VocaDBの検索に失敗しました"));

    await openAndSearch("テオ");

    expect(toast.error).toHaveBeenCalledWith("VocaDBの検索に失敗しました");
  });

  it("検索中は検索ボタンを押せない", async () => {
    let resolveSearch: (songs: (typeof TELL_YOUR_WORLD)[]) => void = () => {};
    mockSearch.mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve;
      })
    );

    await openAndSearch("テオ");

    expect(screen.getByRole("button", { name: "検索中..." })).toBeDisabled();

    resolveSearch([]);
    expect(await screen.findByText("見つかりませんでした")).toBeInTheDocument();
  });

  it("閉じると前回の検索結果は残らない", async () => {
    mockSearch.mockResolvedValue([TELL_YOUR_WORLD]);

    const user = await openAndSearch();
    expect(screen.getByRole("listitem")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "閉じる" }));
    await user.click(screen.getByRole("button", { name: "VocaDBから検索" }));

    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "検索語" })).toHaveValue("");
  });
});
