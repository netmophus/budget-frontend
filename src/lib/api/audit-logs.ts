import { apiClient } from './client';
import type {
  AuditLogResponse,
  AuditStatut,
  AuditTypeAction,
  PaginatedResponse,
} from './types';

export interface ListAuditLogsQuery {
  page?: number;
  limit?: number;
  utilisateur?: string;
  typeAction?: AuditTypeAction;
  entiteCible?: string;
  idCible?: string;
  statut?: AuditStatut;
  dateDebut?: string;
  dateFin?: string;
}

export async function listAuditLogs(
  query: ListAuditLogsQuery = {},
): Promise<PaginatedResponse<AuditLogResponse>> {
  const { data } = await apiClient.get<PaginatedResponse<AuditLogResponse>>(
    '/audit-logs',
    { params: query },
  );
  return data;
}

export async function getAuditLog(id: string): Promise<AuditLogResponse> {
  const { data } = await apiClient.get<AuditLogResponse>(`/audit-logs/${id}`);
  return data;
}
