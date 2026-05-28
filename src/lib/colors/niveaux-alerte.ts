/**
 * Couleurs et libellés des niveaux d'alerte du tableau de bord
 * Budget vs Réalisé (Lot 8.5.C — graphiques Recharts).
 *
 * Source unique de vérité pour la couleur de chaque niveau d'alerte :
 *  - Utilisé par KpiCardsRow (refacto Lot 8.5.C — remplace les hex
 *    inline hardcodés)
 *  - Utilisé par les 3 composants graphiques (EcartsBarChartMensuel,
 *    EcartsDonutNiveaux, EcartsTop10Comptes)
 *
 * Origine des hex : Charte v1 MIZNAS (cf. src/index.css :root tokens
 * `--miznas-cat-*`) + tailwind red-600 pour CRITIQUE. Référence
 * historique : KpiCardsRow.tsx lignes 63-99 et 117-138 avant ce Lot.
 */
import type { NiveauAlerte } from '@/lib/api/tableau-bord';

export const COULEURS_NIVEAU: Record<NiveauAlerte, string> = {
  CRITIQUE: '#DC2626', // rouge tailwind red-600
  ATTENTION: '#BA7517', // ambre MIZNAS Charte v1 (--miznas-ambre / cat-reporting)
  NORMAL: '#0F6E56', // vert validé MIZNAS (--miznas-cat-validation)
  MANQUANT: '#5F6B7A', // gris ardoise MIZNAS (--miznas-cat-config)
};

export const LIBELLES_NIVEAU: Record<NiveauAlerte, string> = {
  CRITIQUE: 'Critique',
  ATTENTION: 'Attention',
  NORMAL: 'Normal',
  MANQUANT: 'Manquant',
};

/**
 * Couleurs Budget / Réalisé pour le bar chart mensuel.
 * Bleu nuit MIZNAS pour le budget (référence stable), violet catégorie
 * REALISE pour le réalisé (cohérent avec le header de
 * TableauBordBudgetVsRealisePage).
 */
export const COULEUR_BUDGET = '#0C447C'; // bleu nuit MIZNAS (--miznas-bleu-nuit)
export const COULEUR_REALISE = '#5B4E91'; // violet catégorie réalisé (--miznas-cat-realise)
