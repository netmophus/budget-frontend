import { apiClient } from './client';
import type { PaginatedResponse } from './types';

/**
 * Les 13 clés des référentiels secondaires (énumérations métier
 * centralisées) — alignées sur les routes
 * /api/v1/configuration/<refKey> du Lot 2.5-bis-A.
 */
export type RefKey =
  | 'type-structure'
  | 'pays'
  | 'type-cr'
  | 'sens-compte'
  | 'classe-compte'
  | 'type-produit'
  | 'categorie-segment'
  | 'type-version'
  | 'statut-version'
  | 'type-scenario'
  | 'statut-scenario'
  | 'type-taux'
  | 'type-action-audit';

export interface RefSecondaire {
  id: string;
  code: string;
  libelle: string;
  description: string | null;
  ordre: number;
  estActif: boolean;
  estSysteme: boolean;
  dateCreation: string;
  utilisateurCreation: string;
  dateModification: string | null;
  utilisateurModification: string | null;
}

export interface CreateRefSecondaireDto {
  code: string;
  libelle: string;
  description?: string;
  ordre?: number;
}

export interface UpdateRefSecondaireDto {
  code?: string;
  libelle?: string;
  description?: string | null;
  ordre?: number;
  estActif?: boolean;
}

export interface ListRefSecondaireQuery {
  page?: number;
  limit?: number;
  estActif?: boolean;
  estSysteme?: boolean;
  search?: string;
}

export interface ToggleActifResult {
  entity: RefSecondaire;
  /**
   * Avertissement non-bloquant. Renvoyé quand on désactive une valeur
   * référencée par une dimension : les saisies existantes restent
   * intactes, mais la valeur n'apparaîtra plus dans les selects.
   */
  warning: string | null;
}

const BASE = '/configuration';

export async function listRefSecondaires(
  refKey: RefKey,
  query: ListRefSecondaireQuery = {},
): Promise<PaginatedResponse<RefSecondaire>> {
  const { data } = await apiClient.get<PaginatedResponse<RefSecondaire>>(
    `${BASE}/${refKey}`,
    { params: query },
  );
  return data;
}

export async function getRefSecondaireById(
  refKey: RefKey,
  id: string,
): Promise<RefSecondaire> {
  const { data } = await apiClient.get<RefSecondaire>(
    `${BASE}/${refKey}/${id}`,
  );
  return data;
}

export async function getRefSecondaireByCode(
  refKey: RefKey,
  code: string,
): Promise<RefSecondaire> {
  const { data } = await apiClient.get<RefSecondaire>(
    `${BASE}/${refKey}/par-code/${code}`,
  );
  return data;
}

export async function createRefSecondaire(
  refKey: RefKey,
  dto: CreateRefSecondaireDto,
): Promise<RefSecondaire> {
  const { data } = await apiClient.post<RefSecondaire>(
    `${BASE}/${refKey}`,
    dto,
  );
  return data;
}

export async function updateRefSecondaire(
  refKey: RefKey,
  id: string,
  dto: UpdateRefSecondaireDto,
): Promise<RefSecondaire> {
  const { data } = await apiClient.patch<RefSecondaire>(
    `${BASE}/${refKey}/${id}`,
    dto,
  );
  return data;
}

export async function toggleActifRefSecondaire(
  refKey: RefKey,
  id: string,
): Promise<ToggleActifResult> {
  const { data } = await apiClient.post<ToggleActifResult>(
    `${BASE}/${refKey}/${id}/toggle-actif`,
  );
  return data;
}

export async function deleteRefSecondaire(
  refKey: RefKey,
  id: string,
): Promise<void> {
  await apiClient.delete(`${BASE}/${refKey}/${id}`);
}
