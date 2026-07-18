import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, within, userEvent, waitFor } from "../../../test-utils";
import { SetlistEditor } from "./SetlistEditor";
import {
  fetchSetlist,
  updateSetlist,
  publishSetlist,
  unpublishSetlist,
  deleteSetlist,
  fetchTrackSuggestions,
  parseImageTracks,
} from "../api";
import * as shareImageModule from "../shareImage";
import { toast } from "sonner";
import type { Setlist } from "../types";

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../api", () => ({
  fetchSetlist: vi.fn(),
  updateSetlist: vi.fn(),
  publishSetlist: vi.fn(),
  unpublishSetlist: vi.fn(),
  deleteSetlist: vi.fn(),
  fetchTrackSuggestions: vi.fn(),
  parseImageTracks: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockFetchSetlist = vi.mocked(fetchSetlist);
const mockUpdateSetlist = vi.mocked(updateSetlist);
const mockPublishSetlist = vi.mocked(publishSetlist);
const mockUnpublishSetlist = vi.mocked(unpublishSetlist);
const mockDeleteSetlist = vi.mocked(deleteSetlist);
const mockFetchTrackSuggestions = vi.mocked(fetchTrackSuggestions);
const mockParseImageTracks = vi.mocked(parseImageTracks);

function buildSetlist(overrides: Partial<Setlist> = {}): Setlist {
  return {
    id: "s1",
    userId: "u1",
    name: "My Set",
    artistName: null,
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
  mockPublishSetlist.mockReset();
  mockUnpublishSetlist.mockReset();
  mockDeleteSetlist.mockReset();
  mockFetchTrackSuggestions.mockReset();
  mockFetchTrackSuggestions.mockResolvedValue([]);
  mockParseImageTracks.mockReset();
  mockNavigate.mockReset();
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
    await user.type(screen.getByLabelText("名義（DJ / アーティスト名）"), "DJ Me");
    await user.type(screen.getByLabelText("イベント名"), "Club Night");
    await user.type(screen.getByLabelText("イベントリンク"), "https://example.com");
    await user.type(screen.getByLabelText("開催日"), "2026-08-01");

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.getByRole("button", { name: "保存中..." })).toBeInTheDocument();
    expect(mockUpdateSetlist).toHaveBeenCalledWith("s1", {
      name: "New Name",
      artistName: "DJ Me",
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
      artistName: null,
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

  it("shows the draft status and a publish button", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ status: "draft" }));
    renderWithProviders(<SetlistEditor id="s1" />);

    await screen.findByLabelText("セットリスト名");
    expect(screen.getByRole("button", { name: "公開する" })).toBeInTheDocument();
  });

  it("saves then publishes and shows a success toast", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ status: "draft" }));
    mockUpdateSetlist.mockResolvedValue(buildSetlist());
    let resolvePublish: (v: Setlist) => void = () => {};
    mockPublishSetlist.mockReturnValue(
      new Promise<Setlist>((res) => {
        resolvePublish = res;
      })
    );
    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);
    await screen.findByLabelText("セットリスト名");

    await user.click(screen.getByRole("button", { name: "公開する" }));

    expect(screen.getByRole("button", { name: "公開中..." })).toBeInTheDocument();
    expect(mockUpdateSetlist).toHaveBeenCalled();
    expect(mockPublishSetlist).toHaveBeenCalledWith("s1");

    resolvePublish(buildSetlist({ status: "published" }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("公開しました");
    });
    expect(screen.getByLabelText("公開URL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "非公開にする" })).toBeInTheDocument();
  });

  it("shows an error toast when publishing fails", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ status: "draft" }));
    mockUpdateSetlist.mockResolvedValue(buildSetlist());
    mockPublishSetlist.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);
    await screen.findByLabelText("セットリスト名");

    await user.click(screen.getByRole("button", { name: "公開する" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("公開に失敗しました");
    });
  });

  it("shows the public URL and unpublish button when published", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ status: "published" }));
    renderWithProviders(<SetlistEditor id="s1" />);

    await screen.findByLabelText("セットリスト名");
    expect(screen.getByRole("button", { name: "非公開にする" })).toBeInTheDocument();
    const urlInput = screen.getByLabelText("公開URL") as HTMLInputElement;
    expect(urlInput.value).toContain("/s/s1");
  });

  it("unpublishes and shows a success toast", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ status: "published" }));
    let resolveUnpublish: (v: Setlist) => void = () => {};
    mockUnpublishSetlist.mockReturnValue(
      new Promise<Setlist>((res) => {
        resolveUnpublish = res;
      })
    );
    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);
    await screen.findByLabelText("セットリスト名");

    await user.click(screen.getByRole("button", { name: "非公開にする" }));

    expect(screen.getByRole("button", { name: "処理中..." })).toBeInTheDocument();
    expect(mockUnpublishSetlist).toHaveBeenCalledWith("s1");

    resolveUnpublish(buildSetlist({ status: "unpublished" }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("非公開にしました");
    });
    expect(screen.getByRole("button", { name: "公開する" })).toBeInTheDocument();
  });

  it("shows an error toast when unpublishing fails", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ status: "published" }));
    mockUnpublishSetlist.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);
    await screen.findByLabelText("セットリスト名");

    await user.click(screen.getByRole("button", { name: "非公開にする" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("非公開に失敗しました");
    });
  });

  it("copies the public URL to the clipboard", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ status: "published" }));
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    renderWithProviders(<SetlistEditor id="s1" />);
    await screen.findByLabelText("セットリスト名");

    await user.click(screen.getByRole("button", { name: "コピー" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/s/s1"));
    });
    expect(toast.success).toHaveBeenCalledWith("コピーしました");
  });

  it("deletes the setlist after confirming and navigates to the dashboard", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ name: "Doomed" }));
    mockDeleteSetlist.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);
    await screen.findByLabelText("セットリスト名");

    await user.click(screen.getByRole("button", { name: "セットリストを削除" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(mockDeleteSetlist).toHaveBeenCalledWith("s1");
    });
    expect(toast.success).toHaveBeenCalledWith("削除しました");
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("keeps the setlist and shows an error toast when deletion fails", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ name: "Doomed" }));
    mockDeleteSetlist.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);
    await screen.findByLabelText("セットリスト名");

    await user.click(screen.getByRole("button", { name: "セットリストを削除" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("削除に失敗しました");
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "セットリストを削除" })).toBeEnabled();
  });

  it("shows suggestions in the track card title input", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ name: "Set", tracks: [] }));
    mockFetchTrackSuggestions.mockResolvedValue([
      { id: "p1", title: "Past Song", artist: "DJ P", songLink: "", source: "", customFields: [] },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);
    await screen.findByLabelText("セットリスト名");

    await user.click(screen.getByRole("button", { name: "トラックを追加" }));
    await user.type(screen.getByLabelText("曲名"), "Past");

    expect(await screen.findByRole("option", { name: /Past Song/ })).toBeInTheDocument();
  });

  it("still renders when the suggestion fetch fails", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ name: "Set" }));
    mockFetchTrackSuggestions.mockRejectedValue(new Error("boom"));
    renderWithProviders(<SetlistEditor id="s1" />);

    expect(await screen.findByLabelText("セットリスト名")).toBeInTheDocument();
  });

  it("renders the image import button", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist());
    renderWithProviders(<SetlistEditor id="s1" />);
    await screen.findByLabelText("セットリスト名");

    expect(screen.getByRole("button", { name: "画像から追加" })).toBeInTheDocument();
  });

  it("adds tracks from image import", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ tracks: [] }));
    mockParseImageTracks.mockResolvedValue([
      { title: "Track A", artist: "Artist A" },
      { title: "Track B", artist: "Artist B" },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);
    await screen.findByLabelText("セットリスト名");

    await user.click(screen.getByRole("button", { name: "画像から追加" }));
    const input = screen.getByLabelText("プレイリスト画像");
    const file = new File([new Uint8Array(10)], "test.png", { type: "image/png" });
    await user.upload(input, file);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("2曲を読み取りました");
    });
    expect(screen.getByDisplayValue("Track A")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Track B")).toBeInTheDocument();
  });

  it("inherits suggestion data when importing tracks that match", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ tracks: [] }));
    mockFetchTrackSuggestions.mockResolvedValue([
      {
        id: "p1",
        title: "Track A",
        artist: "Original Artist",
        songLink: "https://link",
        source: "Beatport",
        customFields: [{ id: "c1", label: "BPM", value: "128" }],
      },
    ]);
    mockParseImageTracks.mockResolvedValue([{ title: "Track A", artist: "Artist A" }]);
    mockUpdateSetlist.mockResolvedValue(buildSetlist());
    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);
    await screen.findByLabelText("セットリスト名");

    await user.click(screen.getByRole("button", { name: "画像から追加" }));
    const input = screen.getByLabelText("プレイリスト画像");
    const file = new File([new Uint8Array(10)], "test.png", { type: "image/png" });
    await user.upload(input, file);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("1曲を読み取りました");
    });

    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(mockUpdateSetlist).toHaveBeenCalled();
    });
    const payload = mockUpdateSetlist.mock.calls[0][1];
    const track = payload.tracks[0] as Record<string, unknown>;
    expect(track).toMatchObject({
      songLink: "https://link",
      source: "Beatport",
    });
    expect(track.customFields).toEqual([{ id: "c1", label: "BPM", value: "128" }]);
  });

  it("shows an error toast when saving with empty-title tracks", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ name: "Set", tracks: [] }));
    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);
    await screen.findByLabelText("セットリスト名");

    await user.click(screen.getByRole("button", { name: "トラックを追加" }));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(toast.error).toHaveBeenCalledWith("曲名が入力されていないトラックがあります");
    expect(mockUpdateSetlist).not.toHaveBeenCalled();
  });

  it("shows an error toast when publishing with empty-title tracks", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ name: "Set", status: "draft", tracks: [] }));
    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);
    await screen.findByLabelText("セットリスト名");

    await user.click(screen.getByRole("button", { name: "トラックを追加" }));
    await user.click(screen.getByRole("button", { name: "公開する" }));

    expect(toast.error).toHaveBeenCalledWith("曲名が入力されていないトラックがあります");
    expect(mockUpdateSetlist).not.toHaveBeenCalled();
    expect(mockPublishSetlist).not.toHaveBeenCalled();
  });

  it("shows the share image button only when published", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ status: "published" }));
    renderWithProviders(<SetlistEditor id="s1" />);

    await screen.findByLabelText("セットリスト名");
    expect(screen.getByRole("button", { name: "シェア画像" })).toBeInTheDocument();
  });

  it("does not show the share image button when in draft", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ status: "draft" }));
    renderWithProviders(<SetlistEditor id="s1" />);

    await screen.findByLabelText("セットリスト名");
    expect(screen.queryByRole("button", { name: "シェア画像" })).not.toBeInTheDocument();
  });

  it("generates and downloads a share image when the button is clicked", async () => {
    mockFetchSetlist.mockResolvedValue(
      buildSetlist({
        name: "Test Set",
        status: "published",
        tracks: [
          { id: "t1", title: "Song", artist: "Artist", songLink: "", source: "", customFields: [] },
        ],
      })
    );
    const fakeBlob = new Blob(["img"], { type: "image/png" });
    vi.spyOn(shareImageModule, "renderShareImage").mockResolvedValue(fakeBlob);
    vi.spyOn(shareImageModule, "downloadBlob").mockImplementation(() => {});
    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);

    await screen.findByLabelText("セットリスト名");
    await user.click(screen.getByRole("button", { name: "シェア画像" }));

    await waitFor(() => {
      expect(shareImageModule.renderShareImage).toHaveBeenCalled();
    });
    expect(shareImageModule.downloadBlob).toHaveBeenCalledWith(fakeBlob, "test-set-share.png");
  });

  it("shows an error toast when share image generation fails", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ name: "Set", status: "published" }));
    vi.spyOn(shareImageModule, "renderShareImage").mockRejectedValue(new Error("fail"));
    vi.spyOn(shareImageModule, "downloadBlob").mockImplementation(() => {});
    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);

    await screen.findByLabelText("セットリスト名");
    await user.click(screen.getByRole("button", { name: "シェア画像" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("画像の生成に失敗しました");
    });
  });

  it("loads thumbnail images before generating a share image", async () => {
    mockFetchSetlist.mockResolvedValue(
      buildSetlist({
        name: "With Thumb",
        status: "published",
        tracks: [
          {
            id: "t1",
            title: "Song",
            artist: "Artist",
            songLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            source: "",
            customFields: [],
          },
        ],
      })
    );
    const fakeBlob = new Blob(["img"], { type: "image/png" });
    vi.spyOn(shareImageModule, "renderShareImage").mockResolvedValue(fakeBlob);
    vi.spyOn(shareImageModule, "downloadBlob").mockImplementation(() => {});

    const OrigImage = globalThis.Image;
    globalThis.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      width = 480;
      height = 360;
      _src = "";
      get src() {
        return this._src;
      }
      set src(v: string) {
        this._src = v;
        queueMicrotask(() => this.onload?.());
      }
    } as unknown as typeof Image;

    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);
    await screen.findByLabelText("セットリスト名");
    await user.click(screen.getByRole("button", { name: "シェア画像" }));

    await waitFor(() => {
      expect(shareImageModule.renderShareImage).toHaveBeenCalled();
    });
    const [, thumbs] = vi.mocked(shareImageModule.renderShareImage).mock.calls[0];
    expect(thumbs).toHaveLength(1);

    globalThis.Image = OrigImage;
  });

  it("uses 'setlist' as the fallback filename when name has no alphanumeric chars", async () => {
    mockFetchSetlist.mockResolvedValue(
      buildSetlist({
        name: "＊＊＊",
        status: "published",
        tracks: [],
      })
    );
    const fakeBlob = new Blob(["img"], { type: "image/png" });
    vi.spyOn(shareImageModule, "renderShareImage").mockResolvedValue(fakeBlob);
    vi.spyOn(shareImageModule, "downloadBlob").mockImplementation(() => {});
    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);

    await screen.findByLabelText("セットリスト名");
    await user.click(screen.getByRole("button", { name: "シェア画像" }));

    await waitFor(() => {
      expect(shareImageModule.downloadBlob).toHaveBeenCalledWith(fakeBlob, "setlist-share.png");
    });
  });

  it("shows an error toast when thumbnail loading fails", async () => {
    mockFetchSetlist.mockResolvedValue(
      buildSetlist({
        name: "Broken",
        status: "published",
        tracks: [
          {
            id: "t1",
            title: "Song",
            artist: "Artist",
            songLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            source: "",
            customFields: [],
          },
        ],
      })
    );
    vi.spyOn(shareImageModule, "renderShareImage").mockResolvedValue(
      new Blob(["img"], { type: "image/png" })
    );
    vi.spyOn(shareImageModule, "downloadBlob").mockImplementation(() => {});

    const OrigImage = globalThis.Image;
    globalThis.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      _src = "";
      get src() {
        return this._src;
      }
      set src(v: string) {
        this._src = v;
        queueMicrotask(() => this.onerror?.(new Error("load failed")));
      }
    } as unknown as typeof Image;

    const user = userEvent.setup();
    renderWithProviders(<SetlistEditor id="s1" />);
    await screen.findByLabelText("セットリスト名");
    await user.click(screen.getByRole("button", { name: "シェア画像" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("画像の生成に失敗しました");
    });

    globalThis.Image = OrigImage;
  });
});
