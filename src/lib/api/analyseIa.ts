/**
 * API client — Historique des analyses MIZNAS AI (Chantier C2).
 *
 *   GET    /analyses-ia       → liste paginée (mes analyses, ou toutes si AI.HISTORIQUE)
 *   GET    /analyses-ia/:id   → détail (markdown + kpi_snapshot)
 *   DELETE /analyses-ia/:id   → suppression (AI.HISTORIQUE)
 */
import { apiClient } from './client';

export interface AnalyseIaListItem {
  id: string;
  dateGeneration: string;
  demandeurEmail: string;
  versionId: string;
  scenarioId: string;
  moisDebut: string;
  moisFin: string;
  modele: string;
  tokensIn: number;
  tokensOut: number;
  dureeMs: number;
  coutEstime: number;
  dryRun: boolean;
  resume: string;
}

export interface AnalyseIaDetail extends AnalyseIaListItem {
  crsSelectionnes: string[] | null;
  promptVersion: string;
  reponseMarkdown: string;
  kpiSnapshot: Record<string, unknown> | null;
}

export interface PaginatedAnalysesIa {
  items: AnalyseIaListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ListerAnalysesIaQuery {
  page?: number;
  limit?: number;
  versionId?: string;
  scenarioId?: string;
  moisDebut?: string;
  moisFin?: string;
}

export async function listerAnalysesIa(
  query: ListerAnalysesIaQuery = {},
): Promise<PaginatedAnalysesIa> {
  const { data } = await apiClient.get<PaginatedAnalysesIa>('/analyses-ia', {
    params: query,
  });
  return data;
}

export async function getAnalyseIaDetail(id: string): Promise<AnalyseIaDetail> {
  const { data } = await apiClient.get<AnalyseIaDetail>(`/analyses-ia/${id}`);
  return data;
}

export async function supprimerAnalyseIa(
  id: string,
): Promise<{ supprime: boolean }> {
  const { data } = await apiClient.delete<{ supprime: boolean }>(
    `/analyses-ia/${id}`,
  );
  return data;
}
