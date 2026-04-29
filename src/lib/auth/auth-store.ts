/**
 * Store auth Zustand.
 *
 * TODO Lot 6 — Sécurité : déplacer le refresh token vers un cookie httpOnly +
 * Secure côté backend (et retirer la persistance localStorage). En l'état,
 * ce stockage est vulnérable XSS si une faille survient ; acceptable au Lot 1
 * car le périmètre est intranet pilote, mais à durcir avant production.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as authApi from '@/lib/api/auth';
import { bindAuthClient } from '@/lib/api/client';
import type { AuthUser, EffectivePermission } from '@/lib/api/types';

interface AuthPersistedState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
}

interface AuthState extends AuthPersistedState {
  permissions: EffectivePermission[];
  roles: string[];
  isLoading: boolean;
  login: (email: string, motDePasse: string) => Promise<void>;
  logout: () => Promise<void>;
  loadCurrentUser: () => Promise<void>;
  setTokens: (access: string, refresh: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      permissions: [],
      roles: [],
      isLoading: false,

      setTokens: (access, refresh) =>
        set({ accessToken: access, refreshToken: refresh }),

      clearSession: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          permissions: [],
          roles: [],
        }),

      login: async (email, motDePasse) => {
        set({ isLoading: true });
        try {
          const { accessToken, refreshToken, user } = await authApi.login(
            email,
            motDePasse,
          );
          set({ accessToken, refreshToken, user });
          await get().loadCurrentUser();
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        const refreshToken = get().refreshToken;
        try {
          await authApi.logout(refreshToken ?? undefined);
        } catch {
          // logout best-effort : l'utilisateur veut sortir, on vide quoi qu'il arrive
        } finally {
          get().clearSession();
        }
      },

      loadCurrentUser: async () => {
        const me = await authApi.getMe();
        const permissions = await authApi.getMyPermissions();
        set({
          user: { id: me.id, email: me.email, nom: me.nom, prenom: me.prenom },
          permissions,
          roles: me.roles.map((r) => r.code),
        });
      },
    }),
    {
      name: 'miznas-auth',
      partialize: (state): AuthPersistedState => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
);

bindAuthClient({
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setTokens: (access, refresh) => useAuthStore.getState().setTokens(access, refresh),
  clearTokens: () => useAuthStore.getState().clearSession(),
});

export function useIsAuthenticated(): boolean {
  return useAuthStore((s) => Boolean(s.accessToken && s.user));
}
