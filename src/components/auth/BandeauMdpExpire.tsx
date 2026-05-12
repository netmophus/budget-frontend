/**
 * BandeauMdpExpire (Lot 6.7.1) — bandeau d'avertissement orange
 * affiché dans AuthLayout sur toutes les pages authentifiées si
 * le mot de passe expire dans moins de 7 jours.
 *
 * Booléen `mdpExpireProchainement` posé par le backend au login
 * (mutuellement exclusif avec `mdpExpire`). Quand `mdpExpire` est
 * vrai, le ProtectedRoute redirige déjà vers /change-mdp, donc ce
 * bandeau n'est jamais évalué dans ce cas.
 *
 * Style : alerte modérée (orange), pas crisis. Lien vers /change-mdp
 * qui, depuis Lot 6.7.1, accepte aussi le cas J-7 (changement
 * recommandé mais non bloquant — bouton "Plus tard" exposé).
 */
import { Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useMdpExpireProchainement } from '@/lib/auth/auth-store';

export function BandeauMdpExpire(): JSX.Element | null {
  const visible = useMdpExpireProchainement();
  if (!visible) return null;

  return (
    <div
      className="mb-4 flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900"
      role="status"
      data-testid="bandeau-mdp-expire"
    >
      <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>Votre mot de passe expire dans moins de 7 jours.</span>
      <Link
        to="/change-mdp"
        className="ml-auto text-orange-700 underline-offset-2 hover:underline"
        data-testid="bandeau-mdp-expire-lien"
      >
        Changer maintenant
      </Link>
    </div>
  );
}
