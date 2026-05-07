/**
 * useDelegationsActives (Lot 4.2-fix.B) — hook qui charge les
 * délégations reçues par l'utilisateur courant et expose celles
 * actives à `today` (côté serveur, le helper applique déjà le
 * filtre date_debut <= today <= date_fin AND actif=true).
 *
 * Utilisé par <BandeauDelegations /> sur les pages métier
 * (/budget/saisie, /budget/a-valider, etc.) pour signaler
 * discrètement à l'utilisateur qu'il agit avec des permissions
 * reçues par délégation.
 */
import { useEffect, useState } from 'react';

import {
  type Delegation,
  listerDelegationsRecues,
} from '@/lib/api/delegations';

interface DelegationsActivesState {
  loading: boolean;
  delegations: Delegation[];
  aDesDelegationsActives: boolean;
}

export function useDelegationsActives(): DelegationsActivesState {
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let actif = true;
    const today = new Date().toISOString().slice(0, 10);
    listerDelegationsRecues({ actif: true, dateRef: today })
      .then((d) => {
        if (actif) setDelegations(d);
      })
      .catch(() => {
        // En cas d'erreur réseau on ne casse pas la page courante :
        // pas de bandeau plutôt qu'une erreur. L'utilisateur verra
        // quand même la page Mes délégations si besoin.
        if (actif) setDelegations([]);
      })
      .finally(() => {
        if (actif) setLoading(false);
      });
    return () => {
      actif = false;
    };
  }, []);

  return {
    loading,
    delegations,
    aDesDelegationsActives: delegations.length > 0,
  };
}
