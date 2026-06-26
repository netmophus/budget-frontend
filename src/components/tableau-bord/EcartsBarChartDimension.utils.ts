/**
 * Helpers purs des bar charts par dimension (CR / ligne métier) — PR2.
 * Agrège Budget vs Réalisé par clé de dimension, trie par écart absolu
 * décroissant et tronque au top N. Séparé du composant pour
 * `react-refresh/only-export-components`.
 */
import type { LigneEcart } from '@/lib/api/tableau-bord';

export interface PointDimension {
  /** Clé de drill-down (codeCr ou codeLigneMetier). */
  cle: string;
  /** Libellé affiché sur l'axe. */
  label: string;
  budget: number;
  realise: number;
  ecartAbs: number;
  tauxExecution: number | null;
}

function aggreger(
  lignes: LigneEcart[],
  getCle: (l: LigneEcart) => string,
  limit: number,
): PointDimension[] {
  const acc = new Map<string, { budget: number; realise: number }>();
  for (const l of lignes) {
    const cle = getCle(l);
    const e = acc.get(cle) ?? { budget: 0, realise: 0 };
    e.budget += l.montantBudget ?? 0;
    e.realise += l.montantRealise ?? 0;
    acc.set(cle, e);
  }
  return [...acc.entries()]
    .map(([cle, v]) => ({
      cle,
      label: cle,
      budget: v.budget,
      realise: v.realise,
      ecartAbs: Math.abs(v.realise - v.budget),
      tauxExecution: v.budget !== 0 ? (v.realise / v.budget) * 100 : null,
    }))
    .sort((a, b) => b.ecartAbs - a.ecartAbs)
    .slice(0, limit);
}

export function aggregerParCR(
  lignes: LigneEcart[],
  limit = 10,
): PointDimension[] {
  return aggreger(lignes, (l) => l.codeCr, limit);
}

export function aggregerParLigneMetier(
  lignes: LigneEcart[],
  limit = 10,
): PointDimension[] {
  return aggreger(lignes, (l) => l.codeLigneMetier, limit);
}
