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
 * Lignes d'exemple du template — codes réels BSIC NIGER (CR_AG_SIEGE,
 * RET_PME, RET_PART…) pour que l'utilisateur parte d'un modèle valide
 * plutôt que de codes génériques. Couvre les 2 modes de saisie.
 */
export const TEMPLATE_EXEMPLES: ReadonlyArray<readonly string[]> = [
  ['CR_AG_SIEGE', '70213', 'RET_PME', '2027-01', 'MONTANT', '10833333', '', '', 'Intérêts prêts à terme PME janvier'],
  ['CR_AG_SIEGE', '70213', 'RET_PME', '2027-02', 'MONTANT', '10833333', '', '', 'Intérêts prêts à terme PME février'],
  ['CR_AG_SIEGE', '70214', 'RET_PART', '2027-01', 'ENCOURS_TIE', '', '2400000000', '0.072', 'Encours immobiliers particuliers'],
];

/**
 * Génère un fichier CSV modèle (header + 3 lignes d'exemple aux codes
 * BSIC réels) pour le bouton « Télécharger le template ». Pas d'API
 * nécessaire. L'utilisateur remplace/complète ces lignes avant import.
 */
export function genererTemplateCsv(): Blob {
  const lignes = [
    TEMPLATE_HEADER.join(','),
    ...TEMPLATE_EXEMPLES.map((l) => l.join(',')),
  ];
  return new Blob([lignes.join('\n') + '\n'], {
    type: 'text/csv;charset=utf-8',
  });
}
