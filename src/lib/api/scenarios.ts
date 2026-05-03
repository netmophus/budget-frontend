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
  exerciceFiscal: number | null;
  dateCreation: string;
  utilisateurCreation: string;
  dateModification: string | null;
  utilisateurModification: string | null;
}

export interface ListScenariosQuery {
  statut?: StatutScenario;
  typeScenario?: TypeScenario;
  exerciceFiscal?: number;
  page?: number;
  limit?: number;
}

export interface CreateScenarioDto {
  codeScenario: string;
  libelle: string;
  typeScenario: TypeScenario;
  commentaire?: string;
  exerciceFiscal?: number;
}

export interface UpdateScenarioDto {
  libelle?: string;
  typeScenario?: TypeScenario;
  commentaire?: string;
  exerciceFiscal?: number;
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

export async function getScenarioById(id: string): Promise<Scenario> {
  const { data } = await apiClient.get<Scenario>(
    `/referentiels/scenarios/${id}`,
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

export async function createScenario(
  dto: CreateScenarioDto,
): Promise<Scenario> {
  const { data } = await apiClient.post<Scenario>(
    '/referentiels/scenarios',
    dto,
  );
  return data;
}

export async function updateScenario(
  id: string,
  dto: UpdateScenarioDto,
): Promise<Scenario> {
  const { data } = await apiClient.patch<Scenario>(
    `/referentiels/scenarios/${id}`,
    dto,
  );
  return data;
}

export async function archiverScenario(id: string): Promise<Scenario> {
  const { data } = await apiClient.post<Scenario>(
    `/referentiels/scenarios/${id}/archiver`,
  );
  return data;
}
