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
