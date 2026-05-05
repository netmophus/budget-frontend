/**
 * Client API des indicateurs consolidés (Lot 3.6).
 *
 * Endpoints :
 *  - GET  /budget/indicateurs/globaux      → IndicateursGlobaux
 *  - GET  /budget/indicateurs/par-cr       → IndicateursParCr[]
 *  - GET  /budget/indicateurs/comparaison  → IndicateursComparaison
 *  - POST /budget/indicateurs/refresh      → RefreshIndicateursResponse
 *
 * Permission requise : BUDGET.LIRE pour les 4 endpoints (lecture seule
 * + refresh manuel autorisé pour tout consultant).
 */
import { apiClient } from './client';

export interface IndicateursFilters {
  versionId: string;
  scenarioId: string;
  exerciceFiscal: number;
}

export interface IndicateursComparaisonFilters {
  versionId: string;
  exerciceFiscal: number;
}

export interface IndicateursGlobaux {
  pnb: number;
  mni: number;
  /** null si PNB ≤ 0 (division impossible). */
  coefExploitation: number | null;
  chargesHorsInterets: number;
  totalProduits: number;
  totalCharges: number;
  nbCrInclus: number;
  /** ISO date — MAX(date_modification) figé dans la vue. */
  derniereMaj: string | null;
}

export interface IndicateursParCr {
  crId: string;
  codeCr: string;
  libelleCr: string;
  pnb: number;
  mni: number;
  coefExploitation: number | null;
  chargesHorsInterets: number;
  totalProduits: number;
}

export interface IndicateursComparaisonScenario {
  scenarioId: string;
  codeScenario: string;
  libelle: string;
  /** 'central' | 'optimiste' | 'pessimiste' | 'alternatif' */
  typeScenario: string;
  pnb: number;
  mni: number;
  coefExploitation: number | null;
  chargesHorsInterets: number;
  totalProduits: number;
  totalCharges: number;
}

export interface IndicateursComparaison {
  version: { id: string; codeVersion: string; libelle: string };
  exerciceFiscal: number;
  scenarios: IndicateursComparaisonScenario[];
  derniereMaj: string | null;
}

export interface RefreshIndicateursResponse {
  dureeMs: number;
  nbLignes: number;
}

/**
 * Seuils métier UEMOA pour le coloriage du coefficient
 * d'exploitation. Cibles BCEAO : < 60 % sain, 60-100 % vigilance,
 * > 100 % non viable.
 */
export const COEF_SEUIL_SAIN = 70;
export const COEF_SEUIL_ALERTE = 100;

export function classerCoefExploitation(
  coef: number | null,
): 'sain' | 'attention' | 'alerte' | 'na' {
  if (coef === null) return 'na';
  if (coef > COEF_SEUIL_ALERTE) return 'alerte';
  if (coef >= COEF_SEUIL_SAIN) return 'attention';
  return 'sain';
}

export async function getIndicateursGlobaux(
  filters: IndicateursFilters,
): Promise<IndicateursGlobaux> {
  const { data } = await apiClient.get<IndicateursGlobaux>(
    '/budget/indicateurs/globaux',
    { params: filters },
  );
  return data;
}

export async function getIndicateursParCr(
  filters: IndicateursFilters,
): Promise<IndicateursParCr[]> {
  const { data } = await apiClient.get<IndicateursParCr[]>(
    '/budget/indicateurs/par-cr',
    { params: filters },
  );
  return data;
}

export async function getIndicateursComparaison(
  filters: IndicateursComparaisonFilters,
): Promise<IndicateursComparaison> {
  const { data } = await apiClient.get<IndicateursComparaison>(
    '/budget/indicateurs/comparaison',
    { params: filters },
  );
  return data;
}

export async function refreshIndicateurs(): Promise<RefreshIndicateursResponse> {
  const { data } = await apiClient.post<RefreshIndicateursResponse>(
    '/budget/indicateurs/refresh',
    {},
  );
  return data;
}
