import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen, waitFor } from "../test-utils";
import SetlistDesignPage from "./SetlistDesignPage";
import { fetchSetlist } from "../features/setlist/api";
import * as shareImageModule from "../features/setlist/shareImage";

vi.mock("../features/setlist/api", () => ({
  fetchSetlist: vi.fn(),
}));

const mockFetchSetlist = vi.mocked(fetchSetlist);

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useParams: () => ({ id: "s1" }) };
});

describe("SetlistDesignPage", () => {
  it("renders the designer with the route id", async () => {
    vi.spyOn(shareImageModule, "renderShareImage").mockResolvedValue(
      new Blob(["img"], { type: "image/png" })
    );
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValue("blob:preview"),
      revokeObjectURL: vi.fn(),
    });
    mockFetchSetlist.mockResolvedValue({
      id: "s1",
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
    });
    renderWithProviders(<SetlistDesignPage />);

    await waitFor(() => {
      expect(screen.getByText("シェア画像デザイン")).toBeInTheDocument();
    });
    expect(mockFetchSetlist).toHaveBeenCalledWith("s1");
  });
});
