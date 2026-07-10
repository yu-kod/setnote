import { SetlistList } from "../features/setlist/components/SetlistList";

export default function DashboardPage() {
  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">ダッシュボード</h2>
      <SetlistList />
    </div>
  );
}
