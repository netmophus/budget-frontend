import { apiClient } from './client';
import type { RoleResponse } from './types';

export async function listRoles(): Promise<RoleResponse[]> {
  const { data } = await apiClient.get<RoleResponse[]>('/roles');
  return data;
}

export async function getRole(id: string): Promise<RoleResponse> {
  const { data } = await apiClient.get<RoleResponse>(`/roles/${id}`);
  return data;
}
