/**
 * BandeauDelegations (Lot 4.2-fix.B) — bandeau d'information
 * affiché en haut des pages métier quand l'utilisateur dispose
 * de permissions reçues par délégation. Ne s'affiche QUE s'il y
 * a au moins 1 délégation active reçue.
 *
 * Style : bleu info sobre, lien vers /mes-delegations pour le
 * détail. Pas d'icône d'alarme (pas un avertissement).
 */
import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useDelegationsActives } from '@/lib/hooks/useDelegationsActives';

export function BandeauDelegations(): JSX.Element | null {
  const { loading, delegations, aDesDelegationsActives } =
    useDelegationsActives();

  if (loading || !aDesDelegationsActives) return null;

  // Compte les permissions distinctes reçues (concaténation des
  // verbes uniques sur toutes les délégations actives).
  const permsDistinctes = new Set<string>();
  for (const d of delegations) {
    for (const p of d.permissions) permsDistinctes.add(p);
  }

  return (
    <div
      className="mb-4 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900"
      role="status"
      data-testid="bandeau-delegations"
    >
      <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        Vous agissez actuellement avec{' '}
        <strong data-testid="bandeau-delegations-count">
          {delegations.length}
        </strong>{' '}
        délégation(s) active(s) ({permsDistinctes.size} permission(s){' '}
        distincte(s)).{' '}
      </span>
      <Link
        to="/mes-delegations"
        className="ml-auto text-blue-700 underline-offset-2 hover:underline"
        data-testid="bandeau-delegations-lien"
      >
        Voir mes délégations
      </Link>
    </div>
  );
}
