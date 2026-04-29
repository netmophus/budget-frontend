import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useIsAuthenticated } from '@/lib/auth/auth-store';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuth = useIsAuthenticated();
  const location = useLocation();
  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
