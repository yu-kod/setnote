import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "../../../test-utils";
import { SetlistDesigner } from "./SetlistDesigner";
import { fetchSetlist } from "../api";
import * as shareImageModule from "../shareImage";
import type { Setlist } from "../types";

vi.mock("../api", () => ({
  fetchSetlist: vi.fn(),
}));

const mockFetchSetlist = vi.mocked(fetchSetlist);
const mockRenderShareImage = vi.fn().mockResolvedValue(new Blob(["img"], { type: "image/png" }));

function buildSetlist(overrides: Partial<Setlist> = {}): Setlist {
  return {
    id: "s1",
    userId: "u1",
    name: "Test Set",
    artistName: null,
    eventName: "Club Night",
    eventLink: null,
    eventDate: null,
    tracks: [
      { id: "t1", title: "Opening", artist: "DJ A", songLink: "", source: "", customFields: [] },
      { id: "t2", title: "Peak Time", artist: "DJ B", songLink: "", source: "", customFields: [] },
    ],
    status: "published",
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  mockFetchSetlist.mockReset();
  mockRenderShareImage.mockClear();
  vi.spyOn(shareImageModule, "renderShareImage").mockImplementation(mockRenderShareImage);
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn().mockReturnValue("blob:preview"),
    revokeObjectURL: vi.fn(),
  });
});

describe("SetlistDesigner", () => {
  it("shows a loading state while fetching", () => {
    mockFetchSetlist.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<SetlistDesigner id="s1" />);
    expect(screen.getByRole("status", { name: "読み込み中" })).toBeInTheDocument();
  });

  it("renders a not-found message when setlist is null", async () => {
    mockFetchSetlist.mockResolvedValue(null);
    renderWithProviders(<SetlistDesigner id="missing" />);
    await waitFor(() => {
      expect(screen.getByText("お探しのページが見つかりませんでした")).toBeInTheDocument();
    });
  });

  it("renders color preset selector with swatches", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist());
    renderWithProviders(<SetlistDesigner id="s1" />);
    await waitFor(() => {
      expect(screen.getByRole("radiogroup", { name: "カラー" })).toBeInTheDocument();
    });
  });

  it("renders decoration preset selector", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist());
    renderWithProviders(<SetlistDesigner id="s1" />);
    await waitFor(() => {
      expect(screen.getByRole("radiogroup", { name: "装飾" })).toBeInTheDocument();
    });
  });

  it("renders a canvas preview", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist());
    renderWithProviders(<SetlistDesigner id="s1" />);
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "プレビュー" })).toBeInTheDocument();
    });
  });

  it("renders a download button", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist());
    renderWithProviders(<SetlistDesigner id="s1" />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "ダウンロード" })).toBeInTheDocument();
    });
  });

  it("changes preview when a different color preset is selected", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist());

    const user = userEvent.setup();
    renderWithProviders(<SetlistDesigner id="s1" />);

    await waitFor(() => {
      expect(screen.getByRole("radiogroup", { name: "カラー" })).toBeInTheDocument();
    });

    const midnightRadio = screen.getByRole("radio", { name: "ミッドナイト" });
    await user.click(midnightRadio);

    await waitFor(() => {
      const calls = mockRenderShareImage.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[2]?.colors?.id).toBe("midnight");
    });
  });

  it("changes preview when a different decoration preset is selected", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist());

    const user = userEvent.setup();
    renderWithProviders(<SetlistDesigner id="s1" />);

    await waitFor(() => {
      expect(screen.getByRole("radiogroup", { name: "装飾" })).toBeInTheDocument();
    });

    const dotsRadio = screen.getByRole("radio", { name: "ドット" });
    await user.click(dotsRadio);

    await waitFor(() => {
      const calls = mockRenderShareImage.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[2]?.decoration?.id).toBe("dots-subtle");
    });
  });

  it("renders not-found when fetch rejects", async () => {
    mockFetchSetlist.mockRejectedValue(new Error("network error"));
    renderWithProviders(<SetlistDesigner id="s1" />);
    await waitFor(() => {
      expect(screen.getByText("お探しのページが見つかりませんでした")).toBeInTheDocument();
    });
  });

  it("downloads the image when the download button is clicked", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist());
    const mockDownloadBlob = vi.fn();
    vi.spyOn(shareImageModule, "downloadBlob").mockImplementation(mockDownloadBlob);

    const user = userEvent.setup();
    renderWithProviders(<SetlistDesigner id="s1" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "ダウンロード" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "ダウンロード" }));

    await waitFor(() => {
      expect(mockDownloadBlob).toHaveBeenCalledWith(expect.any(Blob), "test-set-share.png");
    });
  });

  it("does not update state after unmount during preview generation", async () => {
    let resolveRender!: (v: Blob) => void;
    mockRenderShareImage.mockReturnValue(
      new Promise<Blob>((res) => {
        resolveRender = res;
      })
    );
    mockFetchSetlist.mockResolvedValue(buildSetlist());
    const { unmount } = renderWithProviders(<SetlistDesigner id="s1" />);

    await waitFor(() => {
      expect(mockRenderShareImage).toHaveBeenCalled();
    });

    unmount();
    resolveRender(new Blob(["img"], { type: "image/png" }));
  });

  it("uses 'setlist' as fallback filename when name has no alphanumeric chars", async () => {
    mockFetchSetlist.mockResolvedValue(buildSetlist({ name: "＊＊＊" }));
    const mockDownloadBlob = vi.fn();
    vi.spyOn(shareImageModule, "downloadBlob").mockImplementation(mockDownloadBlob);

    const user = userEvent.setup();
    renderWithProviders(<SetlistDesigner id="s1" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "ダウンロード" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "ダウンロード" }));

    await waitFor(() => {
      expect(mockDownloadBlob).toHaveBeenCalledWith(expect.any(Blob), "setlist-share.png");
    });
  });
});
