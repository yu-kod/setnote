import { Routes, Route, Link } from "react-router-dom";
import SetlistPage from "./pages/SetlistPage";
import SignupPage from "./pages/SignupPage";
import ConfirmPage from "./pages/ConfirmPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import DashboardPage from "./pages/DashboardPage";
import LandingPage from "./pages/LandingPage";
import { ProtectedRoute } from "./features/auth/components/ProtectedRoute";

export default function App() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-2 md:px-6">
      <Link to="/" className="block no-underline">
        <header className="py-6 pb-4 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
            setnote
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">DJセットリストを作成・共有</p>
        </header>
      </Link>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/s/:id" element={<SetlistPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/confirm" element={<ConfirmPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <footer className="py-8 pb-4 text-center text-xs text-muted-foreground">
        <Link to="/terms" className="text-muted-foreground transition-colors hover:text-primary">
          利用規約
        </Link>
        <span className="mx-2 text-border">|</span>
        <Link to="/privacy" className="text-muted-foreground transition-colors hover:text-primary">
          プライバシーポリシー
        </Link>
      </footer>
    </div>
  );
}
