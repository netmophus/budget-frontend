import { apiClient } from './client';
import type {
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
