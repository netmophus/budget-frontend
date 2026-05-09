import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useDoitChangerMdp, useIsAuthenticated } from '@/lib/auth/auth-store';

/**
 * Protège une route qui exige un user authentifié ET un mdp valide
 * (Lot 6.4.C.2). Si le user a un mdp expiré ou temporaire, on force
 * la redirection vers /change-mdp — le backend renverrait 403
 * MDP_EXPIRE/MDP_TEMPORAIRE sur tout autre endpoint API tant que le
 * flag persiste (cf. PasswordExpiredGuard du Lot 6.4.A).
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const isAuth = useIsAuthenticated();
  const doitChangerMdp = useDoitChangerMdp();
  const location = useLocation();
  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (doitChangerMdp && location.pathname !== '/change-mdp') {
    return <Navigate to="/change-mdp" replace />;
  }
  return <>{children}</>;
}
