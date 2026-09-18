import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { renderWithProviders } from "./test-utils";
import App from "./App";

const mockUseAuth = vi.fn();
const mockLogout = vi.fn();

vi.mock("./features/auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("./features/analytics/api", () => ({
  fetchTrackUsage: vi.fn().mockResolvedValue([]),
  fetchViews: vi.fn().mockResolvedValue([]),
  fetchLikes: vi.fn().mockResolvedValue([]),
}));

vi.mock("./features/admin/api", () => ({
  fetchAdminUsers: vi.fn().mockResolvedValue({
    total: 1,
    confirmed: 1,
    unconfirmed: 0,
    disabled: 0,
    newLast7Days: 0,
    newLast30Days: 0,
    growth: [],
  }),
  fetchAdminContent: vi.fn().mockResolvedValue({
    setlists: 0,
    published: 0,
    draft: 0,
    totalViews: 0,
    totalLikes: 0,
    totalTracks: 0,
    activeUsers: 0,
  }),
  fetchAdminHealth: vi.fn().mockResolvedValue({
    invocations: 0,
    errors: 0,
    errorRate: 0,
    throttles: 0,
    avgDurationMs: 0,
    maxDurationMs: 0,
    apiRequests: 0,
    apiErrors5xx: 0,
    status: "ok",
    invocationSeries: [],
    errorSeries: [],
  }),
}));

vi.mock("./features/setlist/api", () => ({
  fetchMySetlists: vi.fn().mockResolvedValue([]),
  createSetlist: vi.fn(),
  fetchPublicSetlist: vi.fn().mockResolvedValue({
    id: "abc123",
    name: "Test Set",
    tracks: [],
    likeCounts: {},
  }),
  recordSetlistView: vi.fn(),
}));

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("App", () => {
  beforeEach(() => {
    mockLogout.mockReset();
    mockUseAuth.mockReturnValue({ isAuthenticated: false, login: vi.fn(), logout: mockLogout });
  });

  it("renders the site title with icon", () => {
    renderWithProviders(<App />);
    expect(screen.getByRole("heading", { name: "setnote" })).toBeInTheDocument();
    const banner = screen.getByRole("banner");
    const icon = within(banner).getByRole("img", { name: "setnote" });
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("src", "/icon-192.png");
  });

  // 一覧表示はスクリーンショットして共有するための表示なので、
  // セットリスト以外のものは画面に残さない。
  it("公開ページの一覧表示ではサイトのヘッダーとフッターを出さない", () => {
    renderApp("/s/abc123?view=list");

    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  it("公開ページの通常表示ではサイトのヘッダーとフッターを出す", () => {
    renderApp("/s/abc123");

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("renders the footer with terms, privacy, and author links", () => {
    renderWithProviders(<App />);
    expect(screen.getByText("利用規約")).toBeInTheDocument();
    expect(screen.getByText("プライバシーポリシー")).toBeInTheDocument();
    const authorLink = screen.getByRole("link", { name: "作者" });
    expect(authorLink).toHaveAttribute("href", "https://x.com/bismuth_72");
    expect(authorLink).toHaveAttribute("target", "_blank");
  });

  it("renders the landing page at /", () => {
    renderApp("/");
    const main = screen.getByRole("main");
    expect(within(main).getByRole("link", { name: "新規登録" })).toBeInTheDocument();
    expect(within(main).getByRole("link", { name: "ログイン" })).toBeInTheDocument();
  });

  it("renders the not-found page for an unknown route", () => {
    renderApp("/no/such/path");
    expect(screen.getByText("お探しのページが見つかりませんでした")).toBeInTheDocument();
  });

  it("renders the terms page at /terms", () => {
    renderApp("/terms");
    expect(screen.getByRole("heading", { name: "利用規約" })).toBeInTheDocument();
  });

  it("renders the privacy policy page at /privacy", () => {
    renderApp("/privacy");
    expect(screen.getByRole("heading", { name: "プライバシーポリシー" })).toBeInTheDocument();
  });

  it("renders login page at /login", () => {
    renderApp("/login");
    expect(screen.getByRole("heading", { name: "ログイン" })).toBeInTheDocument();
  });

  it("redirects /dashboard to /login when not authenticated", () => {
    renderApp("/dashboard");
    expect(screen.getByRole("heading", { name: "ログイン" })).toBeInTheDocument();
  });

  it("renders dashboard when authenticated", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, logout: mockLogout });
    renderApp("/dashboard");
    expect(screen.getByRole("heading", { name: "ダッシュボード" })).toBeInTheDocument();
  });

  it("shows the logout button and dashboard link in the header when authenticated", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, logout: mockLogout });
    renderApp("/dashboard");
    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("button", { name: "ログアウト" })).toBeInTheDocument();
    expect(within(banner).getByRole("link", { name: "ダッシュボード" })).toBeInTheDocument();
  });

  it("shows an analytics link in the header when authenticated", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, logout: mockLogout });
    renderApp("/dashboard");
    expect(
      within(screen.getByRole("banner")).getByRole("link", { name: "分析" })
    ).toBeInTheDocument();
  });

  it("renders the analytics page when authenticated at /analytics", async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, logout: mockLogout });
    renderApp("/analytics");
    expect(await screen.findByRole("heading", { name: "分析" })).toBeInTheDocument();
  });

  it("redirects /analytics to /login when not authenticated", () => {
    renderApp("/analytics");
    expect(screen.getByRole("heading", { name: "ログイン" })).toBeInTheDocument();
  });

  it("renders the track-list detail page at /analytics/tracks when authenticated", async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, logout: mockLogout });
    renderApp("/analytics/tracks");
    expect(await screen.findByRole("heading", { name: "曲の使用回数" })).toBeInTheDocument();
  });

  it("renders the likes detail page at /analytics/likes when authenticated", async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, logout: mockLogout });
    renderApp("/analytics/likes");
    expect(await screen.findByRole("heading", { name: "いいねランキング" })).toBeInTheDocument();
  });

  it("renders the views detail page at /analytics/views when authenticated", async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, logout: mockLogout });
    renderApp("/analytics/views");
    expect(await screen.findByRole("heading", { name: "表示回数ランキング" })).toBeInTheDocument();
  });

  it("calls logout when the logout button is clicked", async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, logout: mockLogout });
    const user = userEvent.setup();
    renderApp("/dashboard");
    await user.click(
      within(screen.getByRole("banner")).getByRole("button", { name: "ログアウト" })
    );
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("shows a login link in the header when not authenticated", () => {
    renderApp("/login");
    expect(
      within(screen.getByRole("banner")).getByRole("link", { name: "ログイン" })
    ).toBeInTheDocument();
  });
});

describe("App admin access", () => {
  it("hides the admin link from a signed in non-admin", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, logout: mockLogout });

    renderWithProviders(<App />);

    expect(screen.queryByRole("link", { name: "管理" })).not.toBeInTheDocument();
  });

  it("shows the admin link to an admin", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, logout: mockLogout });

    renderWithProviders(<App />);

    expect(screen.getByRole("link", { name: "管理" })).toHaveAttribute("href", "/admin");
  });

  it("renders the admin page at /admin for an admin", async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: true, logout: mockLogout });

    renderApp("/admin");

    expect(await screen.findByRole("heading", { name: "管理" })).toBeInTheDocument();
  });

  it("sends a non-admin away from /admin", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isAdmin: false, logout: mockLogout });

    renderApp("/admin");

    expect(screen.getByRole("heading", { name: "ダッシュボード" })).toBeInTheDocument();
  });
});
