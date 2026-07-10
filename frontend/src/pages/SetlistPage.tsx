import { useParams } from "react-router-dom";

export default function SetlistPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="card">
      <p className="text-muted">セットリスト: {id}</p>
      <p className="mt-16 text-muted text-sm">（実装予定）</p>
    </div>
  );
}
