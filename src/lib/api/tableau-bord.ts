/**
 * Client API tableau de bord budget vs réalisé (Lot 5.2.C).
 * Aligné sur les DTOs backend src/tableau-de-bord/dto/tableau-bord.dto.ts.
 */
import { apiClient } from './client';

export type NiveauAlerte = 'NORMAL' | 'ATTENTION' | 'CRITIQUE' | 'MANQUANT';
export type NatureCompte = 'CHARGE' | 'PRODUIT' | 'BILAN';
export type SensEcart = 'FAVORABLE' | 'DEFAVORABLE' | 'NEUTRE';

export interface FiltresEcarts {
  versionId: string;
  scenarioId: string;
  crIds?: string[];
  ligneMetierIds?: string[];
  moisDebut: string; // YYYY-MM
  moisFin: string; // YYYY-MM
  seuilEcartPctAttention?: number;
  seuilEcartPctCritique?: number;
}

export interface LigneEcart {
  codeCr: string;
  libelleCr: string;
  codeCompte: string;
  libelleCompte: string;
  classeCompte: string;
  natureCompte: NatureCompte;
  codeLigneMetier: string;
  mois: string;
  libelleMois: string;
  montantBudget: number;
  montantRealise: number | null;
  ecart: number | null;
  ecartAbs: number | null;
  ecartPct: number | null;
  niveauAlerte: NiveauAlerte;
  sensEcart: SensEcart | null;
}

export interface KpiEcarts {
  nbEcartsTotal: number;
  nbEcartsCritique: number;
  nbEcartsAttention: number;
  nbLignesManquantes: number;
  ecartTotalAbs: number;
  ecartTotalDefavorable: number;
  ecartTotalFavorable: number;
}

export interface EcartsResponse {
  filtres: FiltresEcarts;
  kpi: KpiEcarts;
  lignes: LigneEcart[];
}

export const NIVEAU_LABEL: Record<NiveauAlerte, string> = {
  NORMAL: 'Normal',
  ATTENTION: 'Attention',
  CRITIQUE: 'Critique',
  MANQUANT: 'Manquant',
};

export const NATURE_LABEL: Record<NatureCompte, string> = {
  CHARGE: 'Charge',
  PRODUIT: 'Produit',
  BILAN: 'Bilan',
};

/**
 * Sérialiseur axios « repeat » : un array `crIds: [14, 15]` devient
 * `crIds=14&crIds=15` au lieu du format par défaut `crIds[]=14&crIds[]=15`.
 *
 * Why : le DTO backend `FiltresEcartsDto` attend `crIds` (sans crochets).
 * Avec `whitelist + forbidNonWhitelisted` dans le ValidationPipe,
 * `crIds[]` est rejeté comme propriété inconnue → 400. Bug détecté au
 * smoke test Lot 5.2 (Aïcha VALIDATEUR).
 */
const PARAMS_SERIALIZER = { indexes: null } as const;

export async function analyserEcarts(
  filtres: FiltresEcarts,
): Promise<EcartsResponse> {
  const { data } = await apiClient.get<EcartsResponse>(
    '/tableau-de-bord/budget-vs-realise',
    { params: filtres, paramsSerializer: PARAMS_SERIALIZER },
  );
  return data;
}

export async function exporterEcartsExcel(
  filtres: FiltresEcarts,
  filenameSuggere = 'ecarts-budget-realise.xlsx',
): Promise<void> {
  const { data, headers } = await apiClient.get<Blob>(
    '/tableau-de-bord/budget-vs-realise/export',
    {
      params: filtres,
      paramsSerializer: PARAMS_SERIALIZER,
      responseType: 'blob',
    },
  );
  // Récupère le filename depuis Content-Disposition si possible
  const cd = headers['content-disposition'];
  let filename = filenameSuggere;
  if (cd) {
    const m = /filename="([^"]+)"/.exec(cd);
    if (m) filename = m[1]!;
  }
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
