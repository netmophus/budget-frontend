import { apiClient } from './client';
import type { PermissionResponse, RoleResponse } from './types';

export async function listRoles(): Promise<RoleResponse[]> {
  const { data } = await apiClient.get<RoleResponse[]>('/roles');
  return data;
}

export async function getRole(id: string): Promise<RoleResponse> {
  const { data } = await apiClient.get<RoleResponse>(`/roles/${id}`);
  return data;
}

/** Liste de toutes les permissions disponibles (gate backend ROLE.LIRE). */
export async function listPermissions(): Promise<PermissionResponse[]> {
  const { data } = await apiClient.get<PermissionResponse[]>('/permissions');
  return data;
}

/** Réponse compacte des mutations de la matrice (PR A backend). */
export interface RolePermissionMutation {
  roleId: string;
  codeRole: string;
  fkPermission: string;
  codePermission: string;
  /** true si le POST n'a rien changé (lien déjà présent, idempotent). */
  deja: boolean;
}

/**
 * Attribue une permission à un rôle (POST idempotent : 200 même si le
 * lien existe déjà, `deja=true`). Réservé à ROLE.GERER côté backend.
 */
export async function ajouterPermissionRole(
  roleId: string,
  fkPermission: string,
): Promise<RolePermissionMutation> {
  const { data } = await apiClient.post<RolePermissionMutation>(
    `/roles/${roleId}/permissions`,
    { fkPermission },
  );
  return data;
}

/**
 * Retire une permission d'un rôle. 403 si garde-fou backend (permission
 * verrouillée sur ADMIN, ou anti-lockout ROLE.GERER).
 */
export async function retirerPermissionRole(
  roleId: string,
  permId: string,
): Promise<RolePermissionMutation> {
  const { data } = await apiClient.delete<RolePermissionMutation>(
    `/roles/${roleId}/permissions/${permId}`,
  );
  return data;
}
