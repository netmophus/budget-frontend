import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuditLogsPage } from '@/pages/AuditLogsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { UsersPage } from '@/pages/UsersPage';
import { useIsAuthenticated } from '@/lib/auth/auth-store';
import { PermissionRoute } from './PermissionRoute';
import { ProtectedRoute } from './ProtectedRoute';

function RootRedirect() {
  const isAuth = useIsAuthenticated();
  return <Navigate to={isAuth ? '/dashboard' : '/login'} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AuthLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route
          path="/users"
          element={
            <PermissionRoute permission="USER.LIRE">
              <UsersPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <PermissionRoute permission="AUDIT.LIRE">
              <AuditLogsPage />
            </PermissionRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
