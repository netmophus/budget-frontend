/**
 * Client API pour l'import budgétaire en masse (Lot 3.7).
 *
 * POST /budget/import — multipart/form-data
 * Permission requise : BUDGET.SAISIR
 */
import { apiClient } from './client';

export type ImportBudgetErrorCode =
  | 'VALIDATION_FORMAT'
  | 'CR_INTROUVABLE'
  | 'CR_PERIMETRE_REFUSE'
  | 'COMPTE_INTROUVABLE'
  | 'COMPTE_AGREGE'
  | 'LIGNE_METIER_INTROUVABLE'
  | 'TEMPS_INTROUVABLE'
  | 'TEMPS_PAS_PREMIER_DU_MOIS'
  | 'MODE_SAISIE_INVALIDE'
  | 'ENCOURS_TIE_CHAMPS_MANQUANTS'
  | 'TIE_HORS_BORNES'
  | 'AUTRE';

export type ImportBudgetWarningCode =
  | 'MONTANT_RECALCULE'
  | 'COMMENTAIRE_TRONQUE';

export interface ImportBudgetError {
  ligneNumero: number;
  code: ImportBudgetErrorCode;
  message: string;
  valeurFournie?: string;
}

export interface ImportBudgetWarning {
  ligneNumero: number;
  code: ImportBudgetWarningCode;
  message: string;
}

export interface ImportBudgetRapport {
  fichier: string;
  tailleKo: number;
  formatDetecte: 'csv' | 'xlsx';
  lignesTotal: number;
  lignesValides: number;
  lignesInserees: number;
  lignesModifiees: number;
  lignesIgnorees: number;
  lignesRejetees: number;
  erreurs: ImportBudgetError[];
  warnings: ImportBudgetWarning[];
  dureeMs: number;
  transactionRollback: boolean;
}

export async function importBudget(
  file: File,
  versionId: string,
  scenarioId: string,
): Promise<ImportBudgetRapport> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('versionId', versionId);
  fd.append('scenarioId', scenarioId);
  const { data } = await apiClient.post<ImportBudgetRapport>(
    '/budget/import',
    fd,
    {
      headers: {
        // Laisser axios déterminer le boundary multipart/form-data.
        'Content-Type': 'multipart/form-data',
      },
    },
  );
  return data;
}

/**
 * En-tête CSV strict — dans le même ordre que la spec backend
 * (cf. import-budget.dto.ts §HEADER_ORDONNE).
 */
export const TEMPLATE_HEADER = [
  'code_cr',
  'code_compte',
  'code_ligne_metier',
  'mois',
  'mode_saisie',
  'montant',
  'encours_moyen',
  'tie',
  'commentaire',
] as const;

/**
 * Génère un fichier CSV vide (header + 1 ligne d'exemple commentée)
 * pour le bouton « Télécharger le template ». Pas d'API nécessaire.
 */
export function genererTemplateCsv(): Blob {
  const lignes = [
    TEMPLATE_HEADER.join(','),
    // Ligne d'exemple — commentée (#) pour qu'elle soit ignorée si
    // l'utilisateur la garde par mégarde (le service la rejettera
    // toutefois — c'est juste indicatif).
    '# Exemple : BR_CIV,611100,RETAIL_PARTICULIERS,2027-01,MONTANT,1000,,,Loyer Q1',
  ];
  return new Blob([lignes.join('\n') + '\n'], {
    type: 'text/csv;charset=utf-8',
  });
}
