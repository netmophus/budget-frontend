import { apiClient } from './client';
import type { PaginatedResponse } from './types';

export type TypeTaux = 'cloture' | 'moyen_mensuel' | 'fixe_budgetaire';

/**
 * Vue compacte d'une dimension référencée — embarquée dans la
 * réponse fait pour épargner aux clients un appel par dimension.
 */
export interface FaitBudgetDimensionRef {
  id: string;
  code: string;
  libelle: string;
}

export interface FaitBudgetTempsRef {
  id: string;
  date: string;
  mois: number;
  annee: number;
}

export interface FaitBudget {
  id: string;
  fkTemps: string;
  fkCompte: string;
  fkStructure: string;
  fkCentre: string;
  fkLigneMetier: string;
  fkProduit: string;
  fkSegment: string;
  fkDevise: string;
  fkVersion: string;
  fkScenario: string;
  montantDevise: number;
  montantFcfa: number;
  tauxChangeApplique: number;
  dateCreation: string;
  utilisateurCreation: string;
  dateModification: string | null;
  utilisateurModification: string | null;
  temps?: FaitBudgetTempsRef;
  compte?: FaitBudgetDimensionRef;
  structure?: FaitBudgetDimensionRef;
  centre?: FaitBudgetDimensionRef;
  ligneMetier?: FaitBudgetDimensionRef;
  produit?: FaitBudgetDimensionRef;
  segment?: FaitBudgetDimensionRef;
  devise?: FaitBudgetDimensionRef;
  version?: FaitBudgetDimensionRef;
  scenario?: FaitBudgetDimensionRef;
}

export type TauxChangeSource =
  | 'fourni-utilisateur'
  | 'auto-pivot-xof'
  | 'auto-fixe-budgetaire'
  | 'auto-cloture'
  | 'auto-moyen-mensuel';

export type MontantFcfaSource = 'fourni-utilisateur' | 'calcule-automatique';

export interface DimensionResolue {
  axe: string;
  codeBusiness: string;
  fkResolu: string;
  dateDebutValidite: string;
  dateFinValidite: string | null;
}

export interface ResolutionDetails {
  tauxChangeSource: TauxChangeSource;
  dateApplicableTaux: string | null;
  montantFcfaSource: MontantFcfaSource;
  dimensionsResolues: DimensionResolue[];
}

export interface FaitBudgetWithResolution extends FaitBudget {
  resolutionDetails: ResolutionDetails;
}

export interface CreateFaitBudgetFromBusinessKeysDto {
  dateMetier: string;
  codeStructure: string;
  codeCentre: string;
  codeCompte: string;
  codeLigneMetier: string;
  codeProduit: string;
  codeSegment: string;
  codeDevise: string;
  codeVersion: string;
  codeScenario: string;
  montantDevise: number;
  tauxChangeApplique?: number;
  montantFcfa?: number;
  typeTaux?: TypeTaux;
}

export interface UpdateFaitBudgetDto {
  montantDevise?: number;
  montantFcfa?: number;
  tauxChangeApplique?: number;
}

export interface ListFaitBudgetQuery {
  codeVersion?: string;
  codeScenario?: string;
  fkVersion?: string;
  fkScenario?: string;
  fkTemps?: string;
  fkCentre?: string;
  fkCompte?: string;
  annee?: number;
  mois?: number;
  page?: number;
  limit?: number;
}

export async function listFaitsBudget(
  query: ListFaitBudgetQuery = {},
): Promise<PaginatedResponse<FaitBudget>> {
  const { data } = await apiClient.get<PaginatedResponse<FaitBudget>>(
    '/faits/budget',
    { params: query },
  );
  return data;
}

export async function getFaitBudget(id: string): Promise<FaitBudget> {
  const { data } = await apiClient.get<FaitBudget>(`/faits/budget/${id}`);
  return data;
}

export async function createFaitBudgetFromBusinessKeys(
  dto: CreateFaitBudgetFromBusinessKeysDto,
): Promise<FaitBudgetWithResolution> {
  const { data } = await apiClient.post<FaitBudgetWithResolution>(
    '/faits/budget/from-business-keys',
    dto,
  );
  return data;
}

export async function updateFaitBudget(
  id: string,
  dto: UpdateFaitBudgetDto,
): Promise<FaitBudget> {
  const { data } = await apiClient.patch<FaitBudget>(`/faits/budget/${id}`, dto);
  return data;
}

export async function deleteFaitBudget(id: string): Promise<void> {
  await apiClient.delete(`/faits/budget/${id}`);
}
