import { apiClient } from './client';
import type {
  ChangerMdpResponse,
  CurrentUserView,
  EffectivePermission,
  ForgotPasswordResponse,
  LoginResponse,
  RefreshResponse,
  ResetPasswordResponse,
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

/**
 * Lot 6.5.A — Demande un lien de réinitialisation de mot de passe.
 * Réponse identique pour email connu/inconnu (anti-énumération).
 */
export async function forgotPassword(
  email: string,
): Promise<ForgotPasswordResponse> {
  const { data } = await apiClient.post<ForgotPasswordResponse>(
    '/auth/forgot-password',
    { email },
  );
  return data;
}

/**
 * Lot 6.5.A — Valide un token reçu par email + applique un nouveau
 * mdp. Le user doit se reconnecter normalement après (pas de
 * tokens JWT auto-émis).
 */
export async function resetPassword(
  token: string,
  nouveauMdp: string,
): Promise<ResetPasswordResponse> {
  const { data } = await apiClient.post<ResetPasswordResponse>(
    '/auth/reset-password',
    { token, nouveauMdp },
  );
  return data;
}
