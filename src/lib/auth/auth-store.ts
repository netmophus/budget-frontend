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
  // Lot 6.4 — flags d'état mot de passe persistés pour que le guard
  // React Router puisse rediriger vers /change-mdp même après un
  // refresh complet de la page (sinon on perdrait l'info au reload).
  mdpExpire: boolean;
  doitChangerMdp: boolean;
  // Lot 6.7.1 — bandeau d'avertissement J-7, persisté pour que le
  // BandeauMdpExpire reste visible après un refresh de page.
  mdpExpireProchainement: boolean;
}

interface AuthState extends AuthPersistedState {
  permissions: EffectivePermission[];
  roles: string[];
  isLoading: boolean;
  login: (email: string, motDePasse: string) => Promise<void>;
  changerMdp: (ancienMdp: string, nouveauMdp: string) => Promise<void>;
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
      mdpExpire: false,
      doitChangerMdp: false,
      mdpExpireProchainement: false,
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
          mdpExpire: false,
          doitChangerMdp: false,
          mdpExpireProchainement: false,
          permissions: [],
          roles: [],
        }),

      login: async (email, motDePasse) => {
        set({ isLoading: true });
        try {
          const {
            accessToken,
            refreshToken,
            user,
            mdpExpire,
            doitChangerMdp,
            mdpExpireProchainement,
          } = await authApi.login(email, motDePasse);
          set({
            accessToken,
            refreshToken,
            user,
            mdpExpire,
            doitChangerMdp,
            mdpExpireProchainement,
          });
          // Si le user doit changer son mdp, on ne charge PAS les
          // permissions (le backend va répondre 403 sur
          // /users/me/permissions tant que mdp expiré ou temporaire).
          // Lot 6.7.1 — mdpExpireProchainement seul ne bloque PAS :
          // l'utilisateur peut continuer à naviguer normalement,
          // le bandeau l'avertira sans contraindre.
          if (!mdpExpire && !doitChangerMdp) {
            await get().loadCurrentUser();
          }
        } finally {
          set({ isLoading: false });
        }
      },

      /**
       * Lot 6.4.C — PATCH /me/password : reçoit de nouveaux tokens
       * SANS flags, remplace ceux du store et débloque la navigation.
       */
      changerMdp: async (ancienMdp, nouveauMdp) => {
        const { accessToken, refreshToken, user } = await authApi.changerMdp(
          ancienMdp,
          nouveauMdp,
        );
        set({
          accessToken,
          refreshToken,
          user,
          mdpExpire: false,
          doitChangerMdp: false,
          mdpExpireProchainement: false,
        });
        await get().loadCurrentUser();
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
        mdpExpire: state.mdpExpire,
        doitChangerMdp: state.doitChangerMdp,
        mdpExpireProchainement: state.mdpExpireProchainement,
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

/**
 * Lot 6.4 — vrai si le user doit changer son mdp avant tout autre
 * accès (mdp expiré OU reset admin forcé). Utilisé par le guard
 * React Router pour forcer la redirection vers /change-mdp.
 */
export function useDoitChangerMdp(): boolean {
  return useAuthStore((s) => s.mdpExpire || s.doitChangerMdp);
}

/**
 * Lot 6.7.1 — vrai si le mdp expire dans la fenêtre J-7 (calcul
 * backend `dateExpirationMdp ∈ ]now, now+7j[`). Mutuellement
 * exclusif avec mdpExpire. Utilisé par le <BandeauMdpExpire />
 * pour avertir l'utilisateur sans bloquer son accès.
 */
export function useMdpExpireProchainement(): boolean {
  return useAuthStore((s) => s.mdpExpireProchainement);
}
