import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { AuditLogsPage } from '@/pages/AuditLogsPage';
import { CalendrierPage } from '@/pages/CalendrierPage';
import { CentresResponsabilitePage } from '@/pages/CentresResponsabilitePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DevisesPage } from '@/pages/DevisesPage';
import { ForceChangePasswordPage } from '@/pages/ForceChangePasswordPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
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

// Lazy-loaded — module Budget (Lot 3.2 + 3.4 + 3.5-mini).
const ScenariosPage = lazy(() =>
  import('@/pages/ScenariosPage').then((m) => ({ default: m.ScenariosPage })),
);
const VersionsPage = lazy(() =>
  import('@/pages/VersionsPage').then((m) => ({ default: m.VersionsPage })),
);
const VersionsAValiderPage = lazy(() =>
  import('@/pages/VersionsAValiderPage').then((m) => ({
    default: m.VersionsAValiderPage,
  })),
);
const VersionsAPublierPage = lazy(() =>
  import('@/pages/VersionsAPublierPage').then((m) => ({
    default: m.VersionsAPublierPage,
  })),
);
const TableauDeBordPage = lazy(() =>
  import('@/pages/TableauDeBordPage').then((m) => ({
    default: m.TableauDeBordPage,
  })),
);
const SaisieBudgetairePage = lazy(() =>
  import('@/pages/SaisieBudgetairePage').then((m) => ({
    default: m.SaisieBudgetairePage,
  })),
);
const SaisieBudgetPage = lazy(() =>
  import('@/pages/SaisieBudgetPage').then((m) => ({
    default: m.SaisieBudgetPage,
  })),
);
const ValidationsPage = lazy(() =>
  import('@/pages/ValidationsPage').then((m) => ({
    default: m.ValidationsPage,
  })),
);
const CoordinationPage = lazy(() =>
  import('@/pages/CoordinationPage').then((m) => ({
    default: m.CoordinationPage,
  })),
);
const ComitePage = lazy(() =>
  import('@/pages/ComitePage').then((m) => ({
    default: m.ComitePage,
  })),
);
// Lot workflow par CR — palier 7 : impression PDF (vue standalone,
// hors layout MIZNAS).
const ImpressionCrPage = lazy(() =>
  import('@/features/budget/comite/impression/ImpressionCrPage').then((m) => ({
    default: m.ImpressionCrPage,
  })),
);
const ImpressionPerimetrePage = lazy(() =>
  import('@/features/budget/comite/impression/ImpressionPerimetrePage').then(
    (m) => ({ default: m.ImpressionPerimetrePage }),
  ),
);
const ImpressionComitePage = lazy(() =>
  import('@/features/budget/comite/impression/ImpressionComitePage').then(
    (m) => ({ default: m.ImpressionComitePage }),
  ),
);
// Lazy-loaded — page Configuration (Lot 2.5-bis-C).
const ConfigurationPage = lazy(() =>
  import('@/pages/ConfigurationPage').then((m) => ({
    default: m.ConfigurationPage,
  })),
);

const AffectationsPage = lazy(() =>
  import('@/pages/AffectationsPage').then((m) => ({
    default: m.AffectationsPage,
  })),
);

// Lazy-loaded — Lot 4.2 : pages délégations.
const MesDelegationsPage = lazy(() =>
  import('@/pages/MesDelegationsPage').then((m) => ({
    default: m.MesDelegationsPage,
  })),
);
const AdminDelegationsPage = lazy(() =>
  import('@/pages/AdminDelegationsPage').then((m) => ({
    default: m.AdminDelegationsPage,
  })),
);

// Lazy-loaded — Lot 5.1 : module Réalisé.
const RealiseSaisiePage = lazy(() =>
  import('@/pages/RealiseSaisiePage').then((m) => ({
    default: m.RealiseSaisiePage,
  })),
);
// Lazy-loaded — Lot 5.2 : tableau de bord budget vs réalisé.
const TableauBordBudgetVsRealisePage = lazy(() =>
  import('@/pages/TableauBordBudgetVsRealisePage').then((m) => ({
    default: m.TableauBordBudgetVsRealisePage,
  })),
);
// Lazy-loaded — Lot 5.3 : reforecast trimestriel.
const ReforecastListePage = lazy(() =>
  import('@/pages/ReforecastListePage').then((m) => ({
    default: m.ReforecastListePage,
  })),
);
const ReforecastDetailPage = lazy(() =>
  import('@/pages/ReforecastDetailPage').then((m) => ({
    default: m.ReforecastDetailPage,
  })),
);

// Lazy-loaded — Lot 8.2.A : module campagnes budgétaires.
const CampagnesPage = lazy(() =>
  import('@/pages/CampagnesPage').then((m) => ({
    default: m.CampagnesPage,
  })),
);
const CampagneDetailPage = lazy(() =>
  import('@/pages/CampagneDetailPage').then((m) => ({
    default: m.CampagneDetailPage,
  })),
);

// Lazy-loaded — Lot 8.2.B : module documents officiels.
const DocumentsPage = lazy(() =>
  import('@/pages/DocumentsPage').then((m) => ({
    default: m.DocumentsPage,
  })),
);
const DocumentDetailPage = lazy(() =>
  import('@/pages/DocumentDetailPage').then((m) => ({
    default: m.DocumentDetailPage,
  })),
);

// Lazy-loaded — Lot 4.3 : notifications email.
const AdminEmailLogPage = lazy(() =>
  import('@/pages/AdminEmailLogPage').then((m) => ({
    default: m.AdminEmailLogPage,
  })),
);
const PreferencesNotificationsPage = lazy(() =>
  import('@/pages/PreferencesNotificationsPage').then((m) => ({
    default: m.PreferencesNotificationsPage,
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

      {/* Lot 6.5.A — flux forgot password self-service. Routes publiques
          (sans ProtectedRoute) car l'utilisateur n'est pas authentifié
          quand il lance le flow. Le backend rate-limite l'endpoint
          /auth/forgot-password à 3/15min/IP. */}
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Lot 6.4.C.2 — page bloquante de changement obligatoire de
          mdp. Hors du AuthLayout (pas de sidebar, plein écran) car
          l'utilisateur ne doit accéder à AUCUNE autre route tant que
          son mdp est expiré ou temporaire. ProtectedRoute fait la
          redirection vers /change-mdp depuis toute autre route. */}
      <Route
        path="/change-mdp"
        element={
          <ProtectedRoute>
            <ForceChangePasswordPage />
          </ProtectedRoute>
        }
      />

      {/* Lot workflow par CR — palier 7 : impression du détail d'un CR.
          Route HORS AuthLayout (vue propre pour impression, sans sidebar
          ni topbar). Protégée (auth) + BUDGET.LIRE ; l'accès fin (CR
          validateur OU saisisseur) est porté par les endpoints data. */}
      <Route
        path="/budget/comite/cr/:crCode/impression"
        element={
          <ProtectedRoute>
            <PermissionRoute permission="BUDGET.LIRE">
              <Suspense fallback={<PageFallback />}>
                <ImpressionCrPage />
              </Suspense>
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      {/* Palier 7.2 — impression du périmètre d'un validateur (hors layout). */}
      <Route
        path="/budget/validations/impression"
        element={
          <ProtectedRoute>
            <PermissionRoute permission="BUDGET.VALIDER">
              <Suspense fallback={<PageFallback />}>
                <ImpressionPerimetrePage />
              </Suspense>
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      {/* Palier 7.3 — impression de la vue globale Comité (hors layout). */}
      <Route
        path="/budget/comite/impression"
        element={
          <ProtectedRoute>
            <PermissionRoute permission="BUDGET.VALIDER">
              <Suspense fallback={<PageFallback />}>
                <ImpressionComitePage />
              </Suspense>
            </PermissionRoute>
          </ProtectedRoute>
        }
      />

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
          path="/admin/affectations"
          element={
            <PermissionRoute permission="USER.GERER">
              <Suspense fallback={<PageFallback />}>
                <AffectationsPage />
              </Suspense>
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
          path="/budget/saisie"
          element={
            <PermissionRoute permission="BUDGET.LIRE">
              <Suspense fallback={<PageFallback />}>
                <SaisieBudgetairePage />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/budget/validations"
          element={
            <PermissionRoute permission="BUDGET.VALIDER">
              <Suspense fallback={<PageFallback />}>
                <ValidationsPage />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/budget/coordination"
          element={
            <PermissionRoute permission="BUDGET.COORDONNER">
              <Suspense fallback={<PageFallback />}>
                <CoordinationPage />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/budget/comite"
          element={
            <PermissionRoute permission="BUDGET.VALIDER">
              <Suspense fallback={<PageFallback />}>
                <ComitePage />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/budget/a-valider"
          element={
            <PermissionRoute permission="BUDGET.VALIDER">
              <Suspense fallback={<PageFallback />}>
                <VersionsAValiderPage />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/budget/a-publier"
          element={
            <PermissionRoute permission="BUDGET.PUBLIER">
              <Suspense fallback={<PageFallback />}>
                <VersionsAPublierPage />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/budget/tableau-de-bord"
          element={
            <PermissionRoute permission="BUDGET.LIRE">
              <Suspense fallback={<PageFallback />}>
                <TableauDeBordPage />
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
        {/* Lot 4.2 — délégations temporaires */}
        <Route
          path="/mes-delegations"
          element={
            <Suspense fallback={<PageFallback />}>
              <MesDelegationsPage />
            </Suspense>
          }
        />
        <Route
          path="/admin/delegations"
          element={
            <PermissionRoute permission="DELEGATION.GERER">
              <Suspense fallback={<PageFallback />}>
                <AdminDelegationsPage />
              </Suspense>
            </PermissionRoute>
          }
        />
        {/* Lot 5.1 — module réalisé */}
        <Route
          path="/realise/saisie"
          element={
            <PermissionRoute permission="REALISE.LIRE">
              <Suspense fallback={<PageFallback />}>
                <RealiseSaisiePage />
              </Suspense>
            </PermissionRoute>
          }
        />
        {/* Lot 5.2 — tableau de bord budget vs réalisé.
            Aligné Lot 7.1 sur le backend tableau-bord.controller.ts
            qui exige les 2 permissions (mode 'all'). */}
        <Route
          path="/tableau-de-bord/budget-vs-realise"
          element={
            <PermissionRoute
              permissions={['BUDGET.LIRE', 'REALISE.LIRE']}
              mode="all"
            >
              <Suspense fallback={<PageFallback />}>
                <TableauBordBudgetVsRealisePage />
              </Suspense>
            </PermissionRoute>
          }
        />
        {/* Lot 5.3 — reforecast trimestriel */}
        <Route
          path="/reforecast"
          element={
            <PermissionRoute permission="BUDGET.LIRE">
              <Suspense fallback={<PageFallback />}>
                <ReforecastListePage />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/reforecast/:id"
          element={
            <PermissionRoute permission="BUDGET.LIRE">
              <Suspense fallback={<PageFallback />}>
                <ReforecastDetailPage />
              </Suspense>
            </PermissionRoute>
          }
        />
        {/* Lot 8.2.A — module documents officiels.
            Routes gardées par DOCUMENT.LIRE (lecture liste/détail).
            Les actions modifiantes (créer/lancer/ajouter membre) sont
            gardées au niveau composant via useHasPermission(
            'CAMPAGNE.GERER'). */}
        <Route
          path="/campagnes"
          element={
            <PermissionRoute permission="DOCUMENT.LIRE">
              <Suspense fallback={<PageFallback />}>
                <CampagnesPage />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/campagnes/:id"
          element={
            <PermissionRoute permission="DOCUMENT.LIRE">
              <Suspense fallback={<PageFallback />}>
                <CampagneDetailPage />
              </Suspense>
            </PermissionRoute>
          }
        />
        {/* Lot 8.2.B — module documents officiels.
            Routes gardées par DOCUMENT.LIRE. Les actions modifiantes
            (créer/éditer/upload/soumettre/viser/signer) sont gardées
            au niveau composant via useHasPermission(DOCUMENT.CREER /
            DOCUMENT.VISER / DOCUMENT.SIGNER) ou check métier
            émetteur/viseur/signataire. */}
        <Route
          path="/documents"
          element={
            <PermissionRoute permission="DOCUMENT.LIRE">
              <Suspense fallback={<PageFallback />}>
                <DocumentsPage />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/documents/:id"
          element={
            <PermissionRoute permission="DOCUMENT.LIRE">
              <Suspense fallback={<PageFallback />}>
                <DocumentDetailPage />
              </Suspense>
            </PermissionRoute>
          }
        />
        {/* Lot 4.3 — notifications email */}
        <Route
          path="/admin/email-log"
          element={
            <PermissionRoute permission="USER.GERER">
              <Suspense fallback={<PageFallback />}>
                <AdminEmailLogPage />
              </Suspense>
            </PermissionRoute>
          }
        />
        <Route
          path="/me/preferences"
          element={
            <Suspense fallback={<PageFallback />}>
              <PreferencesNotificationsPage />
            </Suspense>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
