import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "../../../test-utils";
import { SetlistList } from "./SetlistList";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockFetchMySetlists = vi.fn();
const mockCreateSetlist = vi.fn();

vi.mock("../api", () => ({
  fetchMySetlists: (...args: unknown[]) => mockFetchMySetlists(...args),
  createSetlist: (...args: unknown[]) => mockCreateSetlist(...args),
}));

beforeEach(() => {
  mockFetchMySetlists.mockReset();
  mockCreateSetlist.mockReset();
  mockNavigate.mockReset();
});

describe("SetlistList", () => {
  it("shows a loading skeleton while fetching", () => {
    mockFetchMySetlists.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<SetlistList />);

    expect(screen.getByRole("status", { name: "読み込み中" })).toBeInTheDocument();
  });

  it("shows empty state when no setlists", async () => {
    mockFetchMySetlists.mockResolvedValue([]);
    renderWithProviders(<SetlistList />);

    await waitFor(() => {
      expect(
        screen.getByText("セットリストがありません。最初のセットリストを作成しましょう")
      ).toBeInTheDocument();
    });
  });

  it("displays setlist items with name, status, event name and event date", async () => {
    mockFetchMySetlists.mockResolvedValue([
      {
        id: "a",
        name: "Summer Festival Set",
        status: "draft",
        eventName: "Summer Fes",
        eventDate: null,
        updatedAt: "2026-07-01T12:00:00Z",
      },
      {
        id: "b",
        name: "Club Night Mix",
        status: "published",
        eventName: null,
        eventDate: "2026-08-01",
        updatedAt: "2026-07-05T18:00:00Z",
      },
      {
        id: "c",
        name: "Bare Set",
        status: "unpublished",
        eventName: null,
        eventDate: null,
        updatedAt: "2026-07-06T18:00:00Z",
      },
    ]);

    renderWithProviders(<SetlistList />);

    await waitFor(() => {
      expect(screen.getByText("Summer Festival Set")).toBeInTheDocument();
    });
    expect(screen.getByText("Club Night Mix")).toBeInTheDocument();
    expect(screen.getByText("Bare Set")).toBeInTheDocument();

    // イベント名は設定時のみ表示
    expect(screen.getByText("Summer Fes")).toBeInTheDocument();
    // 開催日は設定時のみ、タイムゾーン非依存で整形表示
    expect(screen.getByText("2026/8/1")).toBeInTheDocument();
    // 更新日（旧表示）はもう出さない
    expect(screen.queryByText("2026/7/1")).not.toBeInTheDocument();

    // draft と unpublished はどちらも "draft" 表示（unpublished は draft 扱い）
    expect(screen.getAllByText("draft")).toHaveLength(2);
    expect(screen.getByText("published")).toBeInTheDocument();
    expect(screen.queryByText("unpublished")).not.toBeInTheDocument();
  });

  it("navigates to edit page when setlist item is clicked", async () => {
    mockFetchMySetlists.mockResolvedValue([
      { id: "abc123", name: "My Set", status: "draft", updatedAt: "2026-07-01T12:00:00Z" },
    ]);
    const user = userEvent.setup();

    renderWithProviders(<SetlistList />);

    await waitFor(() => {
      expect(screen.getByText("My Set")).toBeInTheDocument();
    });
    await user.click(screen.getByText("My Set"));

    expect(mockNavigate).toHaveBeenCalledWith("/setlists/abc123/edit");
  });

  it("opens modal dialog when clicking new setlist button", async () => {
    mockFetchMySetlists.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithProviders(<SetlistList />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "新規作成" })).toBeInTheDocument();
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "新規作成" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("creates a new setlist via modal and navigates to edit page", async () => {
    mockFetchMySetlists.mockResolvedValue([]);
    mockCreateSetlist.mockResolvedValue({ id: "new123", name: "New Set" });
    const user = userEvent.setup();

    renderWithProviders(<SetlistList />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "新規作成" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "新規作成" }));

    await user.type(screen.getByLabelText("セットリスト名"), "New Set");
    await user.click(screen.getByRole("button", { name: "作成" }));

    await waitFor(() => {
      expect(mockCreateSetlist).toHaveBeenCalledWith("New Set");
    });
    expect(mockNavigate).toHaveBeenCalledWith("/setlists/new123/edit");
  });

  it("closes modal when cancel button is clicked", async () => {
    mockFetchMySetlists.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithProviders(<SetlistList />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "新規作成" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "新規作成" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("shows error when fetch fails", async () => {
    mockFetchMySetlists.mockRejectedValue(new Error("Network error"));
    renderWithProviders(<SetlistList />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Network error");
    });
  });

  it("shows fallback error when fetch rejects with non-Error", async () => {
    mockFetchMySetlists.mockRejectedValue("network failure");
    renderWithProviders(<SetlistList />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("エラーが発生しました");
    });
  });

  it("shows error when create setlist fails with Error", async () => {
    mockFetchMySetlists.mockResolvedValue([]);
    mockCreateSetlist.mockRejectedValue(new Error("Create failed"));
    const user = userEvent.setup();

    renderWithProviders(<SetlistList />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "新規作成" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "新規作成" }));
    await user.type(screen.getByLabelText("セットリスト名"), "Failing Set");
    await user.click(screen.getByRole("button", { name: "作成" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Create failed");
    });
  });

  it("does not create setlist when name is only whitespace", async () => {
    mockFetchMySetlists.mockResolvedValue([]);
    const user = userEvent.setup();

    renderWithProviders(<SetlistList />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "新規作成" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "新規作成" }));
    await user.type(screen.getByLabelText("セットリスト名"), " ");
    await user.click(screen.getByRole("button", { name: "作成" }));

    expect(mockCreateSetlist).not.toHaveBeenCalled();
  });

  it("shows fallback error when create setlist rejects with non-Error", async () => {
    mockFetchMySetlists.mockResolvedValue([]);
    mockCreateSetlist.mockRejectedValue("something went wrong");
    const user = userEvent.setup();

    renderWithProviders(<SetlistList />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "新規作成" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "新規作成" }));
    await user.type(screen.getByLabelText("セットリスト名"), "Failing Set");
    await user.click(screen.getByRole("button", { name: "作成" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("作成に失敗しました");
    });
  });
});
