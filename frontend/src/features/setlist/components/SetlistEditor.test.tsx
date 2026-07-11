import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, within, userEvent, waitFor } from "../../../test-utils";
import { SetlistEditor } from "./SetlistEditor";
import { fetchSetlist, updateSetlist } from "../api";
import { toast } from "sonner";
import type { Setlist } from "../types";

vi.mock("../api", () => ({
  fetchSetlist: vi.fn(),
  updateSetlist: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockFetchSetlist = vi.mocked(fetchSetlist);
const mockUpdateSetlist = vi.mocked(updateSetlist);

function buildSetlist(overrides: Partial<Setlist> = {}): Setlist {
  return {
    id: "s1",
    userId: "u1",
    name: "My Set",
    eventName: null,
    eventLink: null,
    eventDate: null,
    tracks: [],
    status: "draft",
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  mockFetchSetlist.mockReset();
  mockUpdateSetlist.mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

describe("SetlistEditor", () => {
  it("shows a loading skeleton while fetching", () => {
    mockFetchSetlist.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<SetlistEditor id="s1" />);

    expect(screen.getByRole("status", { name: "読み込み中" })).toBeInTheDocument();
  });

  it("populates the form with the fetched setlist", async () => {
    mockFetchSetlist.mockResolvedValue(
      buildSetlist({
        name: "Summer Set",
        eventName: "Summer Fes",
        eventLink: null,
        eventDate: null,
      })
    );
    renderWithProviders(<SetlistEditor id="s1" />);

    await waitFor(() => {
      expect(screen.getByLabelText("セットリスト名")).toHaveValue("Summer Set");
    });
    expect(screen.getByLabelText("イベント名")).toHaveValue("Summer Fes");
    expect(screen.getByLabelText("イベントリンク")).toHaveValue("");
    expect(screen.getByLabelText("開催日")).toHaveValue("");
  });

  it("renders a not-found page when the setlist does not exist", async () => {
    mockFetchSetlist.mockResolvedValue(null);
    renderWithProviders(<SetlistEditor id="missing" />);

    await waitFor(() => {
      expect(screen.getByText("お探しのページが見つかりませんでした")).toBeInTheDocument();
    });
  });

  it("renders a not-found page when fetching fails", async () => {
    mockFetchSetlist.mockRejectedValue(new Error("boom"));
    renderWithProviders(<SetlistEditor id="s1" />);

    await waitFor(() => {
      expect(screen.getByText("お探しのページが見つかりませんでした")).toBeInTheDocument();
    });
  });

  it("shows a back link to the dashboard", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist());
    renderWithProviders(<SetlistEditor id="s1" />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /ダッシュボード/ })).toHaveAttribute(
        "href",
        "/dashboard"
      );
    });
  });

  it("disables the save button when the name is empty", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ name: "My Set" }));
    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);

    const nameInput = await screen.findByLabelText("セットリスト名");
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();

    await user.clear(nameInput);

    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
  });

  it("saves edited fields and shows a success toast", async () => {
    const keepTrack = {
      id: "tk1",
      title: "keep me",
      artist: "",
      songLink: "",
      source: "",
      customFields: [],
    };
    const original = buildSetlist({ name: "Old", tracks: [keepTrack] });
    mockFetchSetlist.mockResolvedValue(original);
    let resolveUpdate: (v: Setlist) => void = () => {};
    mockUpdateSetlist.mockReturnValue(
      new Promise<Setlist>((res) => {
        resolveUpdate = res;
      })
    );
    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);

    const nameInput = await screen.findByLabelText("セットリスト名");
    await user.clear(nameInput);
    await user.type(nameInput, "New Name");
    await user.type(screen.getByLabelText("イベント名"), "Club Night");
    await user.type(screen.getByLabelText("イベントリンク"), "https://example.com");
    await user.type(screen.getByLabelText("開催日"), "2026-08-01");

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.getByRole("button", { name: "保存中..." })).toBeInTheDocument();
    expect(mockUpdateSetlist).toHaveBeenCalledWith("s1", {
      name: "New Name",
      eventName: "Club Night",
      eventLink: "https://example.com",
      eventDate: "2026-08-01",
      tracks: [keepTrack],
    });

    resolveUpdate(buildSetlist({ name: "New Name" }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("保存しました");
    });
  });

  it("shows an error toast when saving fails", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ name: "Keep" }));
    mockUpdateSetlist.mockRejectedValue(new Error("save failed"));
    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);

    await screen.findByLabelText("セットリスト名");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("保存に失敗しました");
    });
    expect(mockUpdateSetlist).toHaveBeenCalledWith("s1", {
      name: "Keep",
      eventName: null,
      eventLink: null,
      eventDate: null,
      tracks: [],
    });
  });

  it("adds a track and includes it when saving", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ name: "Set", tracks: [] }));
    mockUpdateSetlist.mockResolvedValue(buildSetlist());
    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);

    await screen.findByLabelText("セットリスト名");
    await user.click(screen.getByRole("button", { name: "トラックを追加" }));
    await user.type(screen.getByLabelText("曲名"), "Opening Track");
    await user.click(screen.getByRole("button", { name: "追加" }));
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(mockUpdateSetlist).toHaveBeenCalled();
    });
    const payload = mockUpdateSetlist.mock.calls[0][1];
    expect(payload.tracks).toHaveLength(1);
    expect(payload.tracks[0]).toMatchObject({ title: "Opening Track" });
  });

  it("edits and deletes tracks before saving", async () => {
    mockFetchSetlist.mockResolvedValue(
      buildSetlist({
        name: "Set",
        tracks: [
          { id: "a", title: "First", artist: "", songLink: "", source: "", customFields: [] },
          { id: "b", title: "Second", artist: "", songLink: "", source: "", customFields: [] },
        ],
      })
    );
    mockUpdateSetlist.mockResolvedValue(buildSetlist());
    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);

    await screen.findByLabelText("セットリスト名");
    await user.type(screen.getAllByLabelText("アーティスト")[0], "DJ One");

    const deleteButtons = screen.getAllByRole("button", { name: "削除" });
    await user.click(deleteButtons[1]);
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "削除" }));

    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(mockUpdateSetlist).toHaveBeenCalled();
    });
    const payload = mockUpdateSetlist.mock.calls[0][1];
    expect(payload.tracks).toHaveLength(1);
    expect(payload.tracks[0]).toMatchObject({ id: "a", title: "First", artist: "DJ One" });
  });
});
