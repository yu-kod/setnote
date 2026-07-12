import { Routes, Route, Link } from "react-router-dom";
import SetlistPage from "./pages/SetlistPage";
import SignupPage from "./pages/SignupPage";
import ConfirmPage from "./pages/ConfirmPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import DashboardPage from "./pages/DashboardPage";
import LandingPage from "./pages/LandingPage";
import SetlistEditPage from "./pages/SetlistEditPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AnalyticsTracksPage from "./pages/AnalyticsTracksPage";
import AnalyticsLikesPage from "./pages/AnalyticsLikesPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import { ProtectedRoute } from "./features/auth/components/ProtectedRoute";
import { useAuth } from "./features/auth/AuthContext";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="mx-auto max-w-2xl px-4 py-2 md:px-6">
      <header className="flex items-center justify-between gap-2 py-6 pb-4">
        <Link to="/" className="no-underline">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">setnote</h1>
          <p className="text-xs text-muted-foreground">DJセットリストを作成・共有</p>
        </Link>
        <nav className="flex items-center gap-1">
          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard">ダッシュボード</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/analytics">分析</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => logout()}>
                ログアウト
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">ログイン</Link>
            </Button>
          )}
        </nav>
      </header>
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
            <Route path="/setlists/:id/edit" element={<SetlistEditPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer className="py-8 pb-4 text-center text-xs text-muted-foreground">
        <Link to="/terms" className="text-muted-foreground transition-colors hover:text-primary">
          利用規約
        </Link>
        <span className="mx-2 text-border">|</span>
        <Link to="/privacy" className="text-muted-foreground transition-colors hover:text-primary">
          プライバシーポリシー
        </Link>
        <span className="mx-2 text-border">|</span>
        <a
          href="https://x.com/tkgmirusen"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground transition-colors hover:text-primary"
        >
          作者
        </a>
      </footer>
      <Toaster />
    </div>
  );
}
