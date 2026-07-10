import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "../test-utils";
import SetlistPage from "./SetlistPage";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useParams: () => ({ id: "abc123" }) };
});

describe("SetlistPage", () => {
  it("renders setlist ID from route params", () => {
    renderWithProviders(<SetlistPage />);

    expect(screen.getByText(/セットリスト: abc123/)).toBeInTheDocument();
  });
});
