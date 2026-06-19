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
