/**
 * Helpers purs de EcartsBarChartMensuel (Lot 8.5.C).
 * Séparés du composant React pour respecter la règle ESLint
 * `react-refresh/only-export-components` (fast refresh HMR).
 */
import type { LigneEcart } from '@/lib/api/tableau-bord';

export interface PointMensuel {
  mois: string; // YYYY-MM, clé de tri chronologique
  libelleMois: string;
  budget: number;
  realise: number;
}

export function aggregerParMois(lignes: LigneEcart[]): PointMensuel[] {
  const acc = new Map<string, PointMensuel>();
  for (const l of lignes) {
    const existing = acc.get(l.mois);
    if (existing) {
      existing.budget += l.montantBudget;
      existing.realise += l.montantRealise ?? 0;
    } else {
      acc.set(l.mois, {
        mois: l.mois,
        libelleMois: l.libelleMois,
        budget: l.montantBudget,
        realise: l.montantRealise ?? 0,
      });
    }
  }
  return [...acc.values()].sort((a, b) => a.mois.localeCompare(b.mois));
}
