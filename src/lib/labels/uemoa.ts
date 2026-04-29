/**
 * Mapping des codes ISO 3 lettres UEMOA → libellés courts FR.
 * Source : modele-donnees.md §3.2 (CHECK constraint code_pays).
 */

export const UEMOA_COUNTRIES = [
  { code: 'BEN', libelle: 'Bénin' },
  { code: 'BFA', libelle: 'Burkina Faso' },
  { code: 'CIV', libelle: "Côte d'Ivoire" },
  { code: 'GNB', libelle: 'Guinée-Bissau' },
  { code: 'MLI', libelle: 'Mali' },
  { code: 'NER', libelle: 'Niger' },
  { code: 'SEN', libelle: 'Sénégal' },
  { code: 'TGO', libelle: 'Togo' },
] as const;

const BY_CODE = new Map<string, string>(
  UEMOA_COUNTRIES.map((c) => [c.code, c.libelle]),
);

export function libellePays(code: string | null): string {
  if (!code) return '—';
  return BY_CODE.get(code) ?? code;
}
