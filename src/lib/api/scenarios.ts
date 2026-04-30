import { apiClient } from './client';
import type { PaginatedResponse } from './types';

export type TypeScenario = 'central' | 'optimiste' | 'pessimiste' | 'alternatif';
export type StatutScenario = 'actif' | 'archive';

export interface Scenario {
  id: string;
  codeScenario: string;
  libelle: string;
  typeScenario: TypeScenario;
  statut: StatutScenario;
  commentaire: string | null;
  dateCreation: string;
  utilisateurCreation: string;
  dateModification: string | null;
  utilisateurModification: string | null;
}

export interface ListScenariosQuery {
  statut?: StatutScenario;
  typeScenario?: TypeScenario;
  page?: number;
  limit?: number;
}

export async function listScenarios(
  query: ListScenariosQuery = {},
): Promise<PaginatedResponse<Scenario>> {
  const { data } = await apiClient.get<PaginatedResponse<Scenario>>(
    '/referentiels/scenarios',
    { params: query },
  );
  return data;
}

export async function getScenarioByCode(
  codeScenario: string,
): Promise<Scenario> {
  const { data } = await apiClient.get<Scenario>(
    `/referentiels/scenarios/par-code/${codeScenario}`,
  );
  return data;
}
