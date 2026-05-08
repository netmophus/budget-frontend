/**
 * Helper de formatage des libellés de mois (Lot 5-fix-ui).
 *
 * Centralise le rendu d'un mois `YYYY-MM` (ex: "2027-03") en libellé
 * français complet (ex: "Mars 2027"). Adopté en remplacement de
 * concaténations ad hoc qui produisaient :
 *  - `Mars 2027 2027` (RealiseSaisiePage : libelleMois déjà annualisé
 *    + concat manuelle de l'année)
 *  - `Mois NaN 2027` (tableau de bord : ancienne implémentation
 *    backend slicing une `Date` native pg).
 *
 * Retourne `'—'` (em-dash) pour toute entrée invalide ou absente,
 * pour ne pas afficher de placeholder technique en UI.
 */

const MOIS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

export function formaterMois(mois: string | null | undefined): string {
  if (!mois || typeof mois !== 'string') return '—';
  const m = /^(\d{4})-(\d{2})$/.exec(mois);
  if (!m) return '—';
  const annee = m[1]!;
  const moisNum = Number(m[2]);
  if (moisNum < 1 || moisNum > 12) return '—';
  return `${MOIS_FR[moisNum - 1]!} ${annee}`;
}
