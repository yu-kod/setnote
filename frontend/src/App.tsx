import { Routes, Route, Link, useLocation } from "react-router-dom";
import SetlistPage from "./pages/SetlistPage";
import SignupPage from "./pages/SignupPage";
import ConfirmPage from "./pages/ConfirmPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import DashboardPage from "./pages/DashboardPage";
import LandingPage from "./pages/LandingPage";
import SetlistEditPage from "./pages/SetlistEditPage";
import SetlistDesignPage from "./pages/SetlistDesignPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AnalyticsTracksPage from "./pages/AnalyticsTracksPage";
import AnalyticsLikesPage from "./pages/AnalyticsLikesPage";
import AnalyticsViewsPage from "./pages/AnalyticsViewsPage";
import AdminPage from "./pages/AdminPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import { ProtectedRoute } from "./features/auth/components/ProtectedRoute";
import { AdminRoute } from "./features/auth/components/AdminRoute";
import { useAuth } from "./features/auth/AuthContext";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";
import { isListViewRoute } from "./features/setlist/listView";

// 狭い画面ではメニューを1行に収めるため、文字とパディングを詰める。
const navButton = "px-2 text-xs sm:px-3 sm:text-sm";

export default function App() {
  const { isAuthenticated, isAdmin, logout } = useAuth();
  // 一覧表示はそのままスクリーンショットを撮るための表示なので、
  // セットリスト以外のもの（サイトのヘッダーとフッター）は画面に残さない。
  const location = useLocation();
  const chromeless = isListViewRoute(location.pathname, location.search);

  return (
    <div className="mx-auto max-w-2xl px-4 py-2 md:px-6">
      {/* 幅が足りないとき、メニューは途中で折り返さず丸ごと次の行に移る。
          ロゴのリンクに flex-1 を付けるとロゴ側が先に潰れて文字が重なるので付けない。 */}
      {!chromeless && (
        <header className="flex flex-wrap items-center gap-x-2 gap-y-3 py-6 pb-4">
          <Link to="/" className="flex min-w-0 items-center gap-2 no-underline">
            <img src="/icon-192.png" alt="setnote" className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                setnote
              </h1>
              {/* 説明文は狭い画面では省く。メニューと幅を取り合って折り返しが増えるため。 */}
              <p className="hidden text-xs text-muted-foreground sm:block">
                DJセットリストを作成・共有
              </p>
            </div>
          </Link>
          <nav className="ml-auto flex shrink-0 items-center gap-1">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="sm" className={navButton} asChild>
                  <Link to="/dashboard">ダッシュボード</Link>
                </Button>
                <Button variant="ghost" size="sm" className={navButton} asChild>
                  <Link to="/analytics">分析</Link>
                </Button>
                {isAdmin && (
                  <Button variant="ghost" size="sm" className={navButton} asChild>
                    <Link to="/admin">管理</Link>
                  </Button>
                )}
                <Button variant="outline" size="sm" className={navButton} onClick={() => logout()}>
                  ログアウト
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" className={navButton} asChild>
                <Link to="/login">ログイン</Link>
              </Button>
            )}
          </nav>
        </header>
      )}
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/s/:id" element={<SetlistPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/confirm" element={<ConfirmPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/analytics/tracks" element={<AnalyticsTracksPage />} />
            <Route path="/analytics/likes" element={<AnalyticsLikesPage />} />
            <Route path="/analytics/views" element={<AnalyticsViewsPage />} />
            <Route path="/setlists/:id/edit" element={<SetlistEditPage />} />
            <Route path="/setlists/:id/design" element={<SetlistDesignPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {!chromeless && (
        <footer className="py-8 pb-4 text-center text-xs text-muted-foreground">
          <Link to="/terms" className="text-muted-foreground transition-colors hover:text-primary">
            利用規約
          </Link>
          <span className="mx-2 text-border">|</span>
          <Link
            to="/privacy"
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            プライバシーポリシー
          </Link>
          <span className="mx-2 text-border">|</span>
          <a
            href="https://x.com/bismuth_72"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            作者
          </a>
        </footer>
      )}
      <Toaster />
    </div>
  );
}
