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
  it("shows loading state while fetching", () => {
    mockFetchMySetlists.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<SetlistList />);

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
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

  it("displays setlist items with name, status badge, and updated date", async () => {
    mockFetchMySetlists.mockResolvedValue([
      {
        id: "abc123",
        name: "Summer Festival Set",
        status: "draft",
        updatedAt: "2026-07-01T12:00:00Z",
      },
      {
        id: "def456",
        name: "Club Night Mix",
        status: "published",
        updatedAt: "2026-07-05T18:00:00Z",
      },
    ]);

    renderWithProviders(<SetlistList />);

    await waitFor(() => {
      expect(screen.getByText("Summer Festival Set")).toBeInTheDocument();
    });
    expect(screen.getByText("Club Night Mix")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
    expect(screen.getByText("published")).toBeInTheDocument();
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

  it("creates a new setlist and navigates to edit page", async () => {
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

  it("shows error when fetch fails", async () => {
    mockFetchMySetlists.mockRejectedValue(new Error("Network error"));
    renderWithProviders(<SetlistList />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Network error");
    });
  });
});
