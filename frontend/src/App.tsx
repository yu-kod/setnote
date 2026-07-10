import { Routes, Route, Link } from "react-router-dom";
import SetlistPage from "./pages/SetlistPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <div className="container">
      <Link to="/" style={{ textDecoration: "none" }}>
        <header className="header">
          <h1>setnote</h1>
          <p>DJセットリストを作成・共有</p>
        </header>
      </Link>
      <Routes>
        <Route path="/s/:id" element={<SetlistPage />} />
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
