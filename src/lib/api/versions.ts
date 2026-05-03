import { apiClient } from './client';
import type { PaginatedResponse } from './types';

export type TypeVersion =
  | 'budget_initial'
  | 'reforecast_1'
  | 'reforecast_2'
  | 'atterrissage';

export type StatutVersion = 'ouvert' | 'soumis' | 'valide' | 'gele';

export interface Version {
  id: string;
  codeVersion: string;
  libelle: string;
  typeVersion: TypeVersion;
  exerciceFiscal: number;
  statut: StatutVersion;
  dateGel: string | null;
  utilisateurGel: string | null;
  commentaire: string | null;
  dateCreation: string;
  utilisateurCreation: string;
  dateModification: string | null;
  utilisateurModification: string | null;
}

/**
 * Réponse étendue de POST /referentiels/versions (Lot 3.2) — porte le
 * code du scénario auto-créé par le hook Q9 si l'exercice n'avait
 * aucun scénario rattaché. Null sinon.
 */
export interface CreateVersionResponse extends Version {
  scenarioAutoCreeCode: string | null;
}

export interface ListVersionsQuery {
  exerciceFiscal?: number;
  statut?: StatutVersion;
  typeVersion?: TypeVersion;
  page?: number;
  limit?: number;
}

export interface CreateVersionDto {
  codeVersion: string;
  libelle: string;
  typeVersion: TypeVersion;
  exerciceFiscal: number;
  commentaire?: string;
}

export interface UpdateVersionDto {
  libelle?: string;
  typeVersion?: TypeVersion;
  exerciceFiscal?: number;
  commentaire?: string;
}

export async function listVersions(
  query: ListVersionsQuery = {},
): Promise<PaginatedResponse<Version>> {
  const { data } = await apiClient.get<PaginatedResponse<Version>>(
    '/referentiels/versions',
    { params: query },
  );
  return data;
}

export async function getVersionById(id: string): Promise<Version> {
  const { data } = await apiClient.get<Version>(
    `/referentiels/versions/${id}`,
  );
  return data;
}

export async function getVersionByCode(codeVersion: string): Promise<Version> {
  const { data } = await apiClient.get<Version>(
    `/referentiels/versions/par-code/${codeVersion}`,
  );
  return data;
}

export async function createVersion(
  dto: CreateVersionDto,
): Promise<CreateVersionResponse> {
  const { data } = await apiClient.post<CreateVersionResponse>(
    '/referentiels/versions',
    dto,
  );
  return data;
}

export async function updateVersion(
  id: string,
  dto: UpdateVersionDto,
): Promise<Version> {
  const { data } = await apiClient.patch<Version>(
    `/referentiels/versions/${id}`,
    dto,
  );
  return data;
}

export async function deleteVersion(id: string): Promise<void> {
  await apiClient.delete(`/referentiels/versions/${id}`);
}
