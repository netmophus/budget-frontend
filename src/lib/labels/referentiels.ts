/**
 * Mappings d'affichage pour les enums des dimensions Référentiels.
 * Cohérent avec les CHECK constraints SQL côté backend.
 */

export const TYPES_STRUCTURE = [
  { value: 'entite_juridique', libelle: 'Entité juridique' },
  { value: 'branche', libelle: 'Branche' },
  { value: 'direction', libelle: 'Direction' },
  { value: 'departement', libelle: 'Département' },
  { value: 'agence', libelle: 'Agence' },
] as const;

const STRUCTURE_BY_VALUE = new Map<string, string>(
  TYPES_STRUCTURE.map((t) => [t.value, t.libelle]),
);

export function libelleTypeStructure(value: string): string {
  return STRUCTURE_BY_VALUE.get(value) ?? value;
}

/** Couleur Tailwind du badge selon le type de structure. */
export function badgeClassTypeStructure(value: string): string {
  switch (value) {
    case 'entite_juridique':
      return 'bg-purple-500 text-white border-transparent';
    case 'branche':
      return 'bg-blue-500 text-white border-transparent';
    case 'direction':
      return 'bg-cyan-500 text-white border-transparent';
    case 'departement':
      return 'bg-teal-500 text-white border-transparent';
    case 'agence':
      return 'bg-green-500 text-white border-transparent';
    default:
      return 'bg-gray-300 text-gray-800 border-transparent';
  }
}

export const TYPES_CR = [
  { value: 'cdc', libelle: 'Centre de coût (CDC)', short: 'CDC' },
  { value: 'cdp', libelle: 'Centre de profit (CDP)', short: 'CDP' },
  { value: 'cdr', libelle: 'Centre de revenu (CDR)', short: 'CDR' },
  { value: 'autre', libelle: 'Autre', short: 'Autre' },
] as const;

const CR_BY_VALUE = new Map<string, { value: string; libelle: string; short: string }>(
  TYPES_CR.map((t) => [
    t.value,
    { value: t.value, libelle: t.libelle, short: t.short },
  ]),
);

export function libelleTypeCr(value: string): string {
  return CR_BY_VALUE.get(value)?.libelle ?? value;
}

export function shortTypeCr(value: string): string {
  return CR_BY_VALUE.get(value)?.short ?? value.toUpperCase();
}

export function badgeClassTypeCr(value: string): string {
  switch (value) {
    case 'cdc':
      return 'bg-orange-500 text-white border-transparent';
    case 'cdp':
      return 'bg-blue-500 text-white border-transparent';
    case 'cdr':
      return 'bg-violet-500 text-white border-transparent';
    case 'autre':
      return 'bg-gray-400 text-white border-transparent';
    default:
      return 'bg-gray-300 text-gray-800 border-transparent';
  }
}

// ─── Comptes (PCB UMOA Révisé) ────────────────────────────────────

/**
 * Fallback statique conservé pour compat tests / écrans hors-ligne ;
 * la source de vérité runtime est `ref_classe_compte` exposé via
 * `useRefSecondaireOptions('classe-compte')` (Lot 2.5-bis-A).
 */
export const CLASSES_COMPTE = [
  { value: '1', libelle: 'Classe 1 — Trésorerie & interbancaire' },
  { value: '2', libelle: 'Classe 2 — Clientèle' },
  { value: '4', libelle: 'Classe 4 — Immobilisations' },
  { value: '5', libelle: 'Classe 5 — Provisions / Fonds propres' },
  { value: '6', libelle: 'Classe 6 — Charges' },
  { value: '7', libelle: 'Classe 7 — Produits' },
] as const;

export function libelleClasseCompte(value: string): string {
  return (
    CLASSES_COMPTE.find((c) => c.value === value)?.libelle ?? `Classe ${value}`
  );
}

/** Couleur Tailwind du badge selon la classe PCB (varchar). */
export function badgeClassClasseCompte(value: string): string {
  switch (value) {
    case '1':
      return 'bg-blue-500 text-white border-transparent';
    case '2':
      return 'bg-violet-500 text-white border-transparent';
    case '4':
      return 'bg-green-500 text-white border-transparent';
    case '5':
      return 'bg-yellow-500 text-white border-transparent';
    case '6':
      return 'bg-orange-500 text-white border-transparent';
    case '7':
      return 'bg-cyan-500 text-white border-transparent';
    default:
      return 'bg-gray-300 text-gray-800 border-transparent';
  }
}

export function libelleSensCompte(value: string | null): string {
  switch (value) {
    case 'D':
      return 'Débit';
    case 'C':
      return 'Crédit';
    case 'M':
      return 'Mixte';
    default:
      return '—';
  }
}

// ─── Produits (typologie bancaire) ────────────────────────────────

export const TYPES_PRODUIT = [
  { value: 'credit', libelle: 'Crédit' },
  { value: 'depot', libelle: 'Dépôt' },
  { value: 'service', libelle: 'Service' },
  { value: 'marche', libelle: 'Marché' },
  { value: 'autre', libelle: 'Autre' },
] as const;

const PRODUIT_BY_VALUE = new Map<string, string>(
  TYPES_PRODUIT.map((t) => [t.value, t.libelle]),
);

export function libelleTypeProduit(value: string): string {
  return PRODUIT_BY_VALUE.get(value) ?? value;
}

export function badgeClassTypeProduit(value: string): string {
  switch (value) {
    case 'credit':
      return 'bg-red-500 text-white border-transparent';
    case 'depot':
      return 'bg-green-500 text-white border-transparent';
    case 'service':
      return 'bg-blue-500 text-white border-transparent';
    case 'marche':
      return 'bg-violet-500 text-white border-transparent';
    case 'autre':
      return 'bg-gray-400 text-white border-transparent';
    default:
      return 'bg-gray-300 text-gray-800 border-transparent';
  }
}

// ─── Segments (catégories clientèle) ──────────────────────────────

export const CATEGORIES_SEGMENT = [
  { value: 'particulier', libelle: 'Particulier' },
  { value: 'professionnel', libelle: 'Professionnel' },
  { value: 'pme', libelle: 'PME' },
  { value: 'grande_entreprise', libelle: 'Grande entreprise' },
  { value: 'institutionnel', libelle: 'Institutionnel' },
  { value: 'secteur_public', libelle: 'Secteur public' },
] as const;

const SEGMENT_BY_VALUE = new Map<string, string>(
  CATEGORIES_SEGMENT.map((c) => [c.value, c.libelle]),
);

export function libelleCategorieSegment(value: string): string {
  return SEGMENT_BY_VALUE.get(value) ?? value;
}

export function badgeClassCategorieSegment(value: string): string {
  switch (value) {
    case 'particulier':
      return 'bg-sky-500 text-white border-transparent';
    case 'professionnel':
      return 'bg-teal-500 text-white border-transparent';
    case 'pme':
      return 'bg-emerald-500 text-white border-transparent';
    case 'grande_entreprise':
      return 'bg-indigo-500 text-white border-transparent';
    case 'institutionnel':
      return 'bg-purple-500 text-white border-transparent';
    case 'secteur_public':
      return 'bg-amber-500 text-white border-transparent';
    default:
      return 'bg-gray-300 text-gray-800 border-transparent';
  }
}
