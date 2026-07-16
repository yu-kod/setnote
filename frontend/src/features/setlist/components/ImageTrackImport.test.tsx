import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent } from "@testing-library/react";
import { renderWithProviders, screen, userEvent, waitFor } from "../../../test-utils";
import { ImageTrackImport } from "./ImageTrackImport";
import { parseImageTracks } from "../api";
import { toast } from "sonner";

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
  return { ...actual, parseImageTracks: vi.fn() };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockParseImageTracks = vi.mocked(parseImageTracks);
const mockOnImport = vi.fn();

beforeEach(() => {
  mockParseImageTracks.mockReset();
  mockOnImport.mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

function createFile(name = "playlist.png", type = "image/png", size = 100): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

describe("ImageTrackImport", () => {
  it("renders the import button", () => {
    renderWithProviders(<ImageTrackImport onImport={mockOnImport} />);

    expect(screen.getByRole("button", { name: "画像から追加" })).toBeInTheDocument();
  });

  it("shows file input when button is clicked", async () => {
    renderWithProviders(<ImageTrackImport onImport={mockOnImport} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "画像から追加" }));

    expect(screen.getByLabelText("プレイリスト画像")).toBeInTheDocument();
  });

  it("calls onImport with parsed tracks on success", async () => {
    const tracks = [
      { title: "Who?", artist: "Azari" },
      { title: "ブレインロット", artist: "東京真中" },
    ];
    mockParseImageTracks.mockResolvedValue(tracks);

    renderWithProviders(<ImageTrackImport onImport={mockOnImport} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "画像から追加" }));
    const input = screen.getByLabelText("プレイリスト画像");
    await user.upload(input, createFile());

    await waitFor(() => {
      expect(mockOnImport).toHaveBeenCalledWith(tracks);
    });
    expect(toast.success).toHaveBeenCalledWith("2曲を読み取りました");
  });

  it("shows error toast when API fails", async () => {
    mockParseImageTracks.mockRejectedValue(new Error("API error"));

    renderWithProviders(<ImageTrackImport onImport={mockOnImport} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "画像から追加" }));
    const input = screen.getByLabelText("プレイリスト画像");
    await user.upload(input, createFile());

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("画像の解析に失敗しました");
    });
    expect(mockOnImport).not.toHaveBeenCalled();
  });

  it("shows error when no tracks are found", async () => {
    mockParseImageTracks.mockResolvedValue([]);

    renderWithProviders(<ImageTrackImport onImport={mockOnImport} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "画像から追加" }));
    const input = screen.getByLabelText("プレイリスト画像");
    await user.upload(input, createFile());

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("トラックを読み取れませんでした");
    });
    expect(mockOnImport).not.toHaveBeenCalled();
  });

  it("shows error for unsupported file type", async () => {
    renderWithProviders(<ImageTrackImport onImport={mockOnImport} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "画像から追加" }));
    const input = screen.getByLabelText("プレイリスト画像");
    const file = createFile("doc.pdf", "application/pdf");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("PNG, JPEG, WebP, GIF のみ対応しています");
    });
    expect(mockParseImageTracks).not.toHaveBeenCalled();
  });

  it("shows error for files over 5MB", async () => {
    renderWithProviders(<ImageTrackImport onImport={mockOnImport} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "画像から追加" }));
    const input = screen.getByLabelText("プレイリスト画像");
    await user.upload(input, createFile("big.png", "image/png", 6 * 1024 * 1024));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("画像は5MB以下にしてください");
    });
    expect(mockParseImageTracks).not.toHaveBeenCalled();
  });

  it("disables button while parsing", async () => {
    mockParseImageTracks.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<ImageTrackImport onImport={mockOnImport} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "画像から追加" }));
    const input = screen.getByLabelText("プレイリスト画像");
    await user.upload(input, createFile());

    await waitFor(() => {
      expect(screen.getByText("解析中...")).toBeInTheDocument();
    });
  });

  it("does nothing when no file is selected", async () => {
    renderWithProviders(<ImageTrackImport onImport={mockOnImport} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "画像から追加" }));
    const input = screen.getByLabelText("プレイリスト画像");
    fireEvent.change(input, { target: { files: [] } });

    expect(mockParseImageTracks).not.toHaveBeenCalled();
    expect(mockOnImport).not.toHaveBeenCalled();
  });

  it("closes the form after cancel", async () => {
    renderWithProviders(<ImageTrackImport onImport={mockOnImport} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "画像から追加" }));
    expect(screen.getByLabelText("プレイリスト画像")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(screen.queryByLabelText("プレイリスト画像")).not.toBeInTheDocument();
  });
});
