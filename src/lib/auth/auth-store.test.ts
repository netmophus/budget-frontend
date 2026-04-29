import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/auth', () => ({
  login: vi.fn().mockResolvedValue({
    accessToken: 'access',
    refreshToken: 'refresh',
    expiresIn: 900,
    user: { id: '1', email: 'admin@miznas.local', nom: 'Admin', prenom: 'MIZNAS' },
  }),
  logout: vi.fn().mockResolvedValue(undefined),
  getMe: vi.fn().mockResolvedValue({
    id: '1',
    email: 'admin@miznas.local',
    nom: 'Admin',
    prenom: 'MIZNAS',
    roles: [{ code: 'ADMIN', libelle: 'Admin', perimetreType: 'global', perimetreId: null }],
    permissions: ['USER.LIRE'],
  }),
  getMyPermissions: vi.fn().mockResolvedValue([
    {
      code_permission: 'USER.LIRE',
      module: 'USER',
      perimetre_type: 'global',
      perimetre_id: null,
    },
  ]),
}));

import { useAuthStore } from './auth-store';

describe('AuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('login: stores tokens, user, roles and permissions', async () => {
    await useAuthStore.getState().login('admin@miznas.local', 'ChangeMe!2026');
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('access');
    expect(state.refreshToken).toBe('refresh');
    expect(state.user?.email).toBe('admin@miznas.local');
    expect(state.roles).toEqual(['ADMIN']);
    expect(state.permissions).toHaveLength(1);
  });

  it('logout: clears the session', async () => {
    useAuthStore.setState({
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: '1', email: 'a@b.c', nom: 'a', prenom: 'b' },
    });
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
