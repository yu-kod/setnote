import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../AuthContext";

/**
 * 管理者以外を弾くルートガード。ProtectedRoute の内側で使う。
 * 画面を隠すだけの措置で、実際のアクセス制御はサーバー側が行う。
 */
export function AdminRoute() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
