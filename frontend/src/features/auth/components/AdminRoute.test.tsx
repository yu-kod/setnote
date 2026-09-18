import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminRoute } from "./AdminRoute";

const mockUseAuth = vi.fn();

vi.mock("../AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

function renderWithRoute(isAdmin: boolean) {
  mockUseAuth.mockReturnValue({ isAdmin });
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<div>Admin Content</div>} />
        </Route>
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AdminRoute", () => {
  it("renders the child route for an admin", () => {
    renderWithRoute(true);
    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });

  it("sends a non-admin back to the dashboard", () => {
    renderWithRoute(false);
    expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });
});
