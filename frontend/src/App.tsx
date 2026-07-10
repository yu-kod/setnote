import { Routes, Route, Link } from "react-router-dom";
import SetlistPage from "./pages/SetlistPage";
import SignupPage from "./pages/SignupPage";
import ConfirmPage from "./pages/ConfirmPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import DashboardPage from "./pages/DashboardPage";
import { ProtectedRoute } from "./features/auth/components/ProtectedRoute";

export default function App() {
  return (
    <div className="container">
      <Link to="/">
        <header className="header">
          <h1>setnote</h1>
          <p>DJセットリストを作成・共有</p>
        </header>
      </Link>
      <Routes>
        <Route path="/s/:id" element={<SetlistPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/confirm" element={<ConfirmPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <footer className="footer">
        <Link to="/terms">利用規約</Link>
        <span className="footer-divider">|</span>
        <Link to="/privacy">プライバシーポリシー</Link>
      </footer>
    </div>
  );
}
