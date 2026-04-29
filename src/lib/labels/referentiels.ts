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
