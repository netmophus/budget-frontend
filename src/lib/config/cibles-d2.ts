/**
 * Cibles budgétaires D2 (Note d'orientation) — Budget 2027 BSIC NIGER.
 *
 * ⚠️ TEMPORAIRE — valeurs codées en dur. MIZNAS ne stocke pas encore les
 * cibles de façon structurée (ni table `dim_cible`, ni champs structurés
 * exposés du document D2, ni paramétrage Configuration).
 *
 * BACKLOG : « Saisie / paramétrage des cibles D2 dans MIZNAS » — rendre
 * ces cibles éditables par version (table dédiée ou Configuration), puis
 * remplacer cette constante par un appel API.
 */
export interface CibleD2 {
  cle: 'pnb' | 'rn' | 'ce' | 'cr' | 'zinder';
  libelle: string;
  /** Sens de la cible : 'min' (réel doit être ≥) ou 'max' (réel ≤). */
  sens: 'min' | 'max';
  valeur: number;
  unite: 'FCFA' | '%';
  /** true si l'indicateur réel consolidé est disponible côté frontend. */
  disponible: boolean;
}

export const CIBLES_D2: CibleD2[] = [
  {
    cle: 'pnb',
    libelle: 'PNB',
    sens: 'min',
    valeur: 1_570_000_000,
    unite: 'FCFA',
    disponible: true,
  },
  {
    cle: 'rn',
    libelle: 'Résultat net',
    sens: 'min',
    valeur: 150_000_000,
    unite: 'FCFA',
    disponible: false,
  },
  {
    cle: 'ce',
    libelle: 'Coefficient d’exploitation',
    sens: 'max',
    valeur: 85,
    unite: '%',
    disponible: false,
  },
  {
    cle: 'cr',
    libelle: 'Coût du risque',
    sens: 'max',
    valeur: 510_000_000,
    unite: 'FCFA',
    disponible: false,
  },
  {
    cle: 'zinder',
    libelle: 'Contribution Zinder',
    sens: 'min',
    valeur: 15,
    unite: '%',
    disponible: false,
  },
];

/** Seuil d'alerte d'écart (5 %) pour le coloriage de la comparaison D2. */
export const ECART_ALERTE_PCT = 5;

// ─── Évaluation réel vs cible (logique partagée palier 5 / palier 6) ──

export type StatutCible = 'atteint' | 'attention' | 'alerte' | 'na';

/**
 * Valeur réelle consolidée disponible côté frontend pour un indicateur.
 * Seul le PNB est consolidé (somme des PNB par CR) ; les autres ne sont
 * pas encore consolidables → `null` (affiché « — », jamais inventé).
 */
export function valeurReelleConsolidee(
  cle: CibleD2['cle'],
  pnbConsolide: number,
): number | null {
  return cle === 'pnb' ? pnbConsolide : null;
}

/** Compare une valeur réelle à sa cible → écart % + statut d'atteinte. */
export function evaluerCible(
  c: CibleD2,
  reel: number | null,
): { ecartPct: number | null; statut: StatutCible } {
  if (reel === null || !c.disponible) return { ecartPct: null, statut: 'na' };
  const ecartPct = ((reel - c.valeur) / c.valeur) * 100;
  const atteint = c.sens === 'min' ? reel >= c.valeur : reel <= c.valeur;
  if (atteint) return { ecartPct, statut: 'atteint' };
  return {
    ecartPct,
    statut: Math.abs(ecartPct) > ECART_ALERTE_PCT ? 'alerte' : 'attention',
  };
}

const FMT_FCFA = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formate une valeur de cible selon son unité (FCFA ou %). */
export function formatValeurCible(v: number, unite: CibleD2['unite']): string {
  return unite === '%' ? `${v} %` : FMT_FCFA.format(v);
}

/** Classes Tailwind du coloriage selon le statut d'atteinte. */
export const CLASSE_STATUT_CIBLE: Record<StatutCible, string> = {
  atteint: 'text-green-700',
  attention: 'text-amber-600',
  alerte: 'text-red-600',
  na: 'text-(--muted-foreground)',
};
