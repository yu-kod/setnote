import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import SetlistEditPage from "./SetlistEditPage";

vi.mock("../features/setlist/components/SetlistEditor", () => ({
  SetlistEditor: ({ id }: { id: string }) => <div>editor:{id}</div>,
}));

describe("SetlistEditPage", () => {
  it("renders the editor with the id from the route", () => {
    render(
      <MemoryRouter initialEntries={["/setlists/abc123/edit"]}>
        <Routes>
          <Route path="/setlists/:id/edit" element={<SetlistEditPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("editor:abc123")).toBeInTheDocument();
  });
});
