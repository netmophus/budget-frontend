/**
 * Helpers purs de EcartsTop10Comptes (Lot 8.5.C).
 * Séparés du composant React pour respecter la règle ESLint
 * `react-refresh/only-export-components` (fast refresh HMR).
 */
import { COULEURS_NIVEAU } from '@/lib/colors/niveaux-alerte';
import type { LigneEcart } from '@/lib/api/tableau-bord';

export interface PointTop {
  label: string;
  ecartAbs: number;
  niveau: LigneEcart['niveauAlerte'];
  fill: string;
  codeCompte: string;
  libelleCompte: string;
  libelleMois: string;
  sensEcart: LigneEcart['sensEcart'];
}

export function truncate(s: string, max = 28): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

/**
 * Top N par sens d'écart (FAVORABLE = sur-performance, DEFAVORABLE =
 * sous-performance), trié par écart absolu décroissant.
 */
export function selectionnerTopParSens(
  lignes: LigneEcart[],
  limit: number,
  sens: 'FAVORABLE' | 'DEFAVORABLE',
): PointTop[] {
  return selectionnerTopN(
    lignes.filter((l) => l.sensEcart === sens),
    limit,
  );
}

export function selectionnerTopN(
  lignes: LigneEcart[],
  limit: number,
): PointTop[] {
  return lignes
    .filter((l): l is LigneEcart & { ecartAbs: number } => l.ecartAbs !== null)
    .sort((a, b) => b.ecartAbs - a.ecartAbs)
    .slice(0, limit)
    .map((l) => ({
      label: `${l.codeCompte} ${truncate(l.libelleCompte, 18)} (${l.libelleMois})`,
      ecartAbs: l.ecartAbs,
      niveau: l.niveauAlerte,
      fill: COULEURS_NIVEAU[l.niveauAlerte],
      codeCompte: l.codeCompte,
      libelleCompte: l.libelleCompte,
      libelleMois: l.libelleMois,
      sensEcart: l.sensEcart,
    }));
}
