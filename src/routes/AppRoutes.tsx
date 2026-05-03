import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuditLogsPage } from '@/pages/AuditLogsPage';
import { CalendrierPage } from '@/pages/CalendrierPage';
import { CentresResponsabilitePage } from '@/pages/CentresResponsabilitePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DevisesPage } from '@/pages/DevisesPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { StructuresPage } from '@/pages/StructuresPage';
import { UsersPage } from '@/pages/UsersPage';
import { useIsAuthenticated } from '@/lib/auth/auth-store';
import { PermissionRoute } from './PermissionRoute';
import { ProtectedRoute } from './ProtectedRoute';

// Lazy-loaded — les 4 pages 2.4C ne sont pas dans le bundle initial.
const ComptesPage = lazy(() =>
  import('@/pages/ComptesPage').then((m) => ({ default: m.ComptesPage })),
);
const LignesMetierPage = lazy(() =>
  import('@/pages/LignesMetierPage').then((m) => ({
    default: m.LignesMetierPage,
  })),
);
const ProduitsPage = lazy(() =>
  import('@/pages/ProduitsPage').then((m) => ({ default: m.ProduitsPage })),
);
const SegmentsPage = lazy(() =>
  import('@/pages/SegmentsPage').then((m) => ({ default: m.SegmentsPage })),
);

// Lazy-loaded — module Budget (Lot 3.2 + 3.5-mini).
const ScenariosPage = lazy(() =>
  import('@/pages/ScenariosPage').then((m) => ({ default: m.ScenariosPage })),
);
const VersionsPage = lazy(() =>
  import('@/pages/VersionsPage').then((m) => ({ default: m.VersionsPage })),
);
const SaisieBudgetPage = lazy(() =>
  import('@/pages/SaisieBudgetPage').then((m) => ({
    default: m.SaisieBudgetPage,
  })),
);

// Lazy-loaded — page Configuration (Lot 2.5-bis-C).
const ConfigurationPage = lazy(() =>
  import('@/pages/ConfigurationPage').then((m) => ({
    default: m.ConfigurationPage,
  })),
);

function PageFallback() {
  return (
    <div className="text-sm text-(--muted-foreground) p-4">Chargement…</div>
  );
}

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
        <Route
          path="/referentiels/temps"
          element={
            <PermissionRoute permission="REFERENTIEL.LIRE">
              <CalendrierPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/referentiels/devises"
          element={
            <PermissionRoute permission="REFERENTIEL.LIRE">
              <DevisesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/referentiels/structures"
          element={
            <PermissionRoute permission="REFERENTIEL.LIRE">
              <StructuresPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/referentiels/centres-responsabilite"
          element={
            <PermissionRoute permission="REFERENTIEL.LIRE">
              <CentresResponsabilitePage />
            </PermissionRoute>
          }
        />
        <Route
          path="/referentiels/comptes"
          element={
            <PermissionRoute permission="REFERENTIEL.LIRE">
              <Suspense fallback={<PageFallback />}>
                <ComptesPage />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/referentiels/lignes-metier"
          element={
            <PermissionRoute permission="REFERENTIEL.LIRE">
              <Suspense fallback={<PageFallback />}>
                <LignesMetierPage />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/referentiels/produits"
          element={
            <PermissionRoute permission="REFERENTIEL.LIRE">
              <Suspense fallback={<PageFallback />}>
                <ProduitsPage />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/referentiels/segments"
          element={
            <PermissionRoute permission="REFERENTIEL.LIRE">
              <Suspense fallback={<PageFallback />}>
                <SegmentsPage />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/budget/scenarios"
          element={
            <PermissionRoute permission="REFERENTIEL.LIRE">
              <Suspense fallback={<PageFallback />}>
                <ScenariosPage />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/budget/versions"
          element={
            <PermissionRoute permission="REFERENTIEL.LIRE">
              <Suspense fallback={<PageFallback />}>
                <VersionsPage />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/budget/versions/:codeVersion/saisie"
          element={
            <PermissionRoute permission="BUDGET.SAISIR">
              <Suspense fallback={<PageFallback />}>
                <SaisieBudgetPage />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/configuration"
          element={
            <PermissionRoute permission="CONFIGURATION.LIRE">
              <Suspense fallback={<PageFallback />}>
                <ConfigurationPage />
              </Suspense>
            </PermissionRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
