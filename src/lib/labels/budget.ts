/**
 * Mappings d'affichage pour les enums du module Budget.
 * Cohérent avec les enums backend (DimVersion / DimScenario / TypeTaux).
 */

import type { StatutVersion, TypeVersion } from '@/lib/api/versions';
import type { StatutScenario, TypeScenario } from '@/lib/api/scenarios';

// ─── Versions de budget ────────────────────────────────────────────

export const TYPES_VERSION = [
  { value: 'budget_initial', libelle: 'Budget initial' },
  { value: 'reforecast_1', libelle: 'Reforecast 1' },
  { value: 'reforecast_2', libelle: 'Reforecast 2' },
  { value: 'atterrissage', libelle: 'Atterrissage' },
] as const;

export function libelleTypeVersion(value: TypeVersion): string {
  return TYPES_VERSION.find((t) => t.value === value)?.libelle ?? value;
}

export function badgeClassTypeVersion(value: TypeVersion): string {
  switch (value) {
    case 'budget_initial':
      return 'bg-blue-500 text-white border-transparent';
    case 'reforecast_1':
      return 'bg-violet-500 text-white border-transparent';
    case 'reforecast_2':
      return 'bg-violet-700 text-white border-transparent';
    case 'atterrissage':
      return 'bg-green-500 text-white border-transparent';
    default:
      return 'bg-gray-300 text-gray-800 border-transparent';
  }
}

/**
 * Vocabulaire UI métier UEMOA (Lot 3.2). Mapping vers les valeurs DB
 * documenté dans `docs/modele-donnees.md` §4.1.2 :
 * - ouvert ↔ Brouillon
 * - soumis ↔ Soumis
 * - valide ↔ Validé
 * - gele   ↔ Publié (gel irréversible BCEAO)
 */
export const STATUTS_VERSION = [
  { value: 'ouvert', libelle: 'Brouillon' },
  { value: 'soumis', libelle: 'Soumis' },
  { value: 'valide', libelle: 'Validé' },
  { value: 'gele', libelle: 'Publié' },
] as const;

export function libelleStatutVersion(value: StatutVersion): string {
  return STATUTS_VERSION.find((s) => s.value === value)?.libelle ?? value;
}

export function badgeClassStatutVersion(value: StatutVersion): string {
  switch (value) {
    case 'ouvert':
      return 'bg-gray-200 text-gray-800 border-transparent';
    case 'soumis':
      return 'bg-orange-500 text-white border-transparent';
    case 'valide':
      return 'bg-blue-500 text-white border-transparent';
    case 'gele':
      return 'bg-green-600 text-white border-transparent';
    default:
      return 'bg-gray-300 text-gray-800 border-transparent';
  }
}

// ─── Scénarios ────────────────────────────────────────────────────

/**
 * Vocabulaire UI : 'central' (DB) s'affiche 'Médian' en interface
 * pour s'aligner sur la terminologie métier UEMOA.
 * Cf. `docs/modele-donnees.md` §4.1.2.
 */
export const TYPES_SCENARIO = [
  { value: 'central', libelle: 'Médian' },
  { value: 'optimiste', libelle: 'Optimiste' },
  { value: 'pessimiste', libelle: 'Pessimiste' },
  { value: 'alternatif', libelle: 'Alternatif' },
] as const;

export function libelleTypeScenario(value: TypeScenario): string {
  return TYPES_SCENARIO.find((s) => s.value === value)?.libelle ?? value;
}

export function badgeClassTypeScenario(value: TypeScenario): string {
  switch (value) {
    case 'central':
      return 'bg-slate-500 text-white border-transparent';
    case 'optimiste':
      return 'bg-emerald-500 text-white border-transparent';
    case 'pessimiste':
      return 'bg-rose-500 text-white border-transparent';
    case 'alternatif':
      return 'bg-amber-500 text-white border-transparent';
    default:
      return 'bg-gray-300 text-gray-800 border-transparent';
  }
}

export function libelleStatutScenario(value: StatutScenario): string {
  return value === 'actif' ? 'Actif' : 'Archivé';
}

// ─── Mesures (montants & taux) ────────────────────────────────────

/**
 * Formate un montant avec séparateurs de milliers (espaces fines)
 * et 0/2/4 décimales selon la devise (XOF=0, EUR/USD=2, taux=4-6).
 */
export function formatMontant(
  value: number | string,
  codeDevise = 'XOF',
): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  const decimales = codeDevise === 'XOF' ? 0 : 2;
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/**
 * Formate un taux de change (6 décimales, séparateurs FR).
 */
export function formatTaux(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  });
}

/**
 * Formate une date ISO (YYYY-MM-DD) en JJ/MM/AAAA. Tolère les
 * formats date-time (slice avant T).
 */
export function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return '—';
  const part = iso.split('T')[0];
  if (!part) return iso;
  const [y, m, d] = part.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/**
 * Vérifie qu'une date au format YYYY-MM-DD tombe sur le 1er du mois.
 * Pure UI — la validation forte est côté backend.
 */
export function estPremierDuMois(iso: string): boolean {
  return /^\d{4}-\d{2}-01$/.test(iso);
}

/**
 * 1er du mois courant au format YYYY-MM-DD.
 */
export function premierDuMoisCourant(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/**
 * Libellé court d'une source de taux (pour affichage drawer / toast).
 */
export function libelleTauxSource(
  src:
    | 'fourni-utilisateur'
    | 'auto-pivot-xof'
    | 'auto-fixe-budgetaire'
    | 'auto-cloture'
    | 'auto-moyen-mensuel',
): string {
  switch (src) {
    case 'fourni-utilisateur':
      return 'Fourni manuellement';
    case 'auto-pivot-xof':
      return 'Devise pivot (XOF = 1.0)';
    case 'auto-fixe-budgetaire':
      return 'Auto — taux fixe budgétaire';
    case 'auto-cloture':
      return 'Auto — taux de clôture';
    case 'auto-moyen-mensuel':
      return 'Auto — taux moyen mensuel';
    default:
      return src;
  }
}
