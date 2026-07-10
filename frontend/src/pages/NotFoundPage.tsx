import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="card text-center">
      <h2>404</h2>
      <p className="text-muted mt-8">お探しのページが見つかりませんでした</p>
      <Link to="/" className="btn btn-outline mt-16" style={{ display: "inline-flex" }}>
        トップに戻る
      </Link>
    </div>
  );
}
