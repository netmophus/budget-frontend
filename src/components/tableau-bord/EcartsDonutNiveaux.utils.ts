/**
 * Helpers purs de EcartsDonutNiveaux (Lot 8.5.C).
 * Séparés du composant React pour respecter la règle ESLint
 * `react-refresh/only-export-components` (fast refresh HMR).
 */
import {
  COULEURS_NIVEAU,
  LIBELLES_NIVEAU,
} from '@/lib/colors/niveaux-alerte';
import type { LigneEcart, NiveauAlerte } from '@/lib/api/tableau-bord';

export interface PointNiveau {
  niveau: NiveauAlerte;
  libelle: string;
  count: number;
  pct: number;
  fill: string;
}

export const ORDRE_NIVEAUX: NiveauAlerte[] = [
  'CRITIQUE',
  'ATTENTION',
  'MANQUANT',
  'NORMAL',
];

export function compterParNiveau(lignes: LigneEcart[]): PointNiveau[] {
  const counts: Record<NiveauAlerte, number> = {
    CRITIQUE: 0,
    ATTENTION: 0,
    MANQUANT: 0,
    NORMAL: 0,
  };
  for (const l of lignes) counts[l.niveauAlerte]++;
  const total = lignes.length;
  return ORDRE_NIVEAUX.map((niveau) => ({
    niveau,
    libelle: LIBELLES_NIVEAU[niveau],
    count: counts[niveau],
    pct: total === 0 ? 0 : Math.round((counts[niveau] / total) * 1000) / 10,
    fill: COULEURS_NIVEAU[niveau],
  }));
}
