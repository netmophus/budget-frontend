import { apiClient } from './client';
import type {
  ChangerMdpResponse,
  CurrentUserView,
  EffectivePermission,
  LoginResponse,
  RefreshResponse,
} from './types';

export async function login(email: string, motDePasse: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', {
    email,
    motDePasse,
  });
  return data;
}

/**
 * Lot 6.4.C — change le mdp de l'utilisateur courant.
 * Renvoie un nouveau couple access/refresh sans flags d'expiration —
 * le frontend doit remplacer ses tokens et débloquer la navigation.
 */
export async function changerMdp(
  ancienMdp: string,
  nouveauMdp: string,
): Promise<ChangerMdpResponse> {
  const { data } = await apiClient.patch<ChangerMdpResponse>('/me/password', {
    ancienMdp,
    nouveauMdp,
  });
  return data;
}

export async function refresh(refreshToken: string): Promise<RefreshResponse> {
  const { data } = await apiClient.post<RefreshResponse>('/auth/refresh', {
    refreshToken,
  });
  return data;
}

export async function logout(refreshToken?: string): Promise<void> {
  await apiClient.post('/auth/logout', refreshToken ? { refreshToken } : {});
}

export async function getMe(): Promise<CurrentUserView> {
  const { data } = await apiClient.get<CurrentUserView>('/auth/me');
  return data;
}

export async function getMyPermissions(): Promise<EffectivePermission[]> {
  const { data } = await apiClient.get<EffectivePermission[]>('/users/me/permissions');
  return data;
}
