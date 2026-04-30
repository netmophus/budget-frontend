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

export interface ListVersionsQuery {
  exerciceFiscal?: number;
  statut?: StatutVersion;
  typeVersion?: TypeVersion;
  page?: number;
  limit?: number;
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

export async function getVersionByCode(codeVersion: string): Promise<Version> {
  const { data } = await apiClient.get<Version>(
    `/referentiels/versions/par-code/${codeVersion}`,
  );
  return data;
}
