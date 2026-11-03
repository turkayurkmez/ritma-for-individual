import { Navigate, Outlet } from 'react-router';
import { useAuth } from './AuthProvider';

export function RequireAuth() {
  const { status } = useAuth();
  if (status === 'loading') return <p>Yükleniyor…</p>;
  if (status === 'anonymous') return <Navigate to="/giris" replace />;
  return <Outlet />;
}
