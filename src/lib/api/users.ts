import { apiClient } from './client';
import type { PaginatedResponse, UserDetailResponse, UserResponse } from './types';

export interface ListUsersQuery {
  page?: number;
  limit?: number;
  email?: string;
  estActif?: boolean;
  /**
   * Lot 4.1-fix.A — quand `true`, chaque UserResponse est enrichi
   * de `nombrePerimetresActifs` (compteur user_perimetres actifs
   * couvrant aujourd'hui). Évite N+1 sur /admin/affectations.
   */
  withPerimetresCount?: boolean;
}

export async function listUsers(
  query: ListUsersQuery = {},
): Promise<PaginatedResponse<UserResponse>> {
  const { data } = await apiClient.get<PaginatedResponse<UserResponse>>('/users', {
    params: query,
  });
  return data;
}

export async function getUser(id: string): Promise<UserDetailResponse> {
  const { data } = await apiClient.get<UserDetailResponse>(`/users/${id}`);
  return data;
}

// ─── Lot Administration ADMIN.C — recherche autocomplete ───────────

export async function rechercherUsers(
  q: string,
  limit = 10,
): Promise<UserResponse[]> {
  const { data } = await apiClient.get<UserResponse[]>('/users/recherche', {
    params: { q, limit },
  });
  return data;
}

// ─── Lot Administration ADMIN.A — CRUD admin ────────────────────────

export interface CreerUserDto {
  email: string;
  nom: string;
  prenom: string;
  motDePasseInitial: string;
  fkRoles: string[];
}

export interface ModifierUserDto {
  email?: string;
  nom?: string;
  prenom?: string;
}

export interface AttribuerRoleDto {
  fkRole: string;
  motif?: string;
}

export interface UserRoleResume {
  id: string;
  fkRole: string;
  codeRole: string;
  libelle: string;
  estActif: boolean;
  dateCreation: string;
}

export interface ResetPasswordResponse {
  motDePasseTemporaire: string;
  message: string;
}

export interface HistoriqueConnexionItem {
  id: string;
  dateAction: string;
  typeAction: 'LOGIN' | 'LOGIN_FAILED' | 'LOGOUT';
  statut: string;
  ipSource: string | null;
  userAgent: string | null;
}

export async function creerUser(dto: CreerUserDto): Promise<UserResponse> {
  const { data } = await apiClient.post<UserResponse>('/admin/users', dto);
  return data;
}

export async function modifierUser(
  id: string,
  dto: ModifierUserDto,
): Promise<UserResponse> {
  const { data } = await apiClient.patch<UserResponse>(`/admin/users/${id}`, dto);
  return data;
}

export async function desactiverUser(id: string): Promise<UserResponse> {
  const { data } = await apiClient.post<UserResponse>(
    `/admin/users/${id}/desactiver`,
    {},
  );
  return data;
}

export async function reactiverUser(id: string): Promise<UserResponse> {
  const { data } = await apiClient.post<UserResponse>(
    `/admin/users/${id}/reactiver`,
    {},
  );
  return data;
}

export async function resetPasswordUser(
  id: string,
): Promise<ResetPasswordResponse> {
  const { data } = await apiClient.post<ResetPasswordResponse>(
    `/admin/users/${id}/reset-password`,
    {},
  );
  return data;
}

export async function forcerDeconnexionUser(
  id: string,
): Promise<{ revoquees: boolean }> {
  const { data } = await apiClient.post<{ revoquees: boolean }>(
    `/admin/users/${id}/forcer-deconnexion`,
    {},
  );
  return data;
}

export async function getHistoriqueConnexion(
  id: string,
): Promise<HistoriqueConnexionItem[]> {
  const { data } = await apiClient.get<HistoriqueConnexionItem[]>(
    `/admin/users/${id}/historique-connexion`,
  );
  return data;
}

export async function listerRolesUser(
  id: string,
): Promise<UserRoleResume[]> {
  const { data } = await apiClient.get<UserRoleResume[]>(
    `/admin/users/${id}/roles`,
  );
  return data;
}

export async function attribuerRoleUser(
  id: string,
  dto: AttribuerRoleDto,
): Promise<UserRoleResume> {
  const { data } = await apiClient.post<UserRoleResume>(
    `/admin/users/${id}/roles`,
    dto,
  );
  return data;
}

export async function retirerRoleUser(
  id: string,
  fkRole: string,
  motif?: string,
): Promise<{ retire: boolean }> {
  const { data } = await apiClient.delete<{ retire: boolean }>(
    `/admin/users/${id}/roles/${fkRole}`,
    { data: motif ? { motif } : {} },
  );
  return data;
}
