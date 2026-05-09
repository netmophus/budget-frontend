/**
 * Tests Vitest de régression — pattern <Navigate /> dans les pages
 * qui font des redirections conditionnelles (Lot 6.4.C.2).
 *
 * Couvre :
 *  - LoginPage : si isAuth=true → doit retourner <Navigate /> (pas
 *    appeler navigate() dans le render).
 *  - ForceChangePasswordPage : si !mdpExpire && !doitChangerMdp →
 *    doit retourner <Navigate /> (pas appeler navigate() en render).
 *
 * Pourquoi ce test existe : les tests Vitest existants pour ces pages
 * mockent `useNavigate` (cf. ForceChangePasswordPage.test.tsx), ce qui
 * masque les warnings React `Cannot update a component while
 * rendering a different component` qui ne se déclenchent que dans
 * un BrowserRouter réel.
 *
 * Le bug initial (palier 6.4.C.2) : `navigate()` appelé dans le
 * corps du render de ForceChangePasswordPage interrompait la
 * transition concurrente /login → /dashboard → /change-mdp et
 * empêchait le composant de se mount du tout (Playwright
 * voyait page blanche). Le fix : pattern déclaratif `<Navigate />`.
 *
 * Ce test rend les pages dans un MemoryRouter RÉEL (sans mock de
 * react-router-dom), spy console.error, et assert qu'aucun
 * warning `Cannot update` n'apparaît au render.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { useAuthStore } from '@/lib/auth/auth-store';
import { ForceChangePasswordPage } from './ForceChangePasswordPage';
import { LoginPage } from './LoginPage';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/components/ui/sonner', () => ({ Toaster: () => null }));

function setStore(partial: Partial<ReturnType<typeof useAuthStore.getState>>) {
  useAuthStore.setState(partial);
}

describe('Redirection pattern (no navigate() in render)', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      mdpExpire: false,
      doitChangerMdp: false,
      permissions: [],
      roles: [],
    });
    cleanup();
  });

  function getRenderWarnings(): string[] {
    return consoleErrorSpy.mock.calls
      .map((args) => args.map(String).join(' '))
      .filter((m) => /Cannot update a component .* while rendering/.test(m));
  }

  it('LoginPage avec isAuth=true ne déclenche pas le warning React `Cannot update`', () => {
    setStore({
      accessToken: 'fake',
      refreshToken: 'fake',
      user: { id: '1', email: 'x@y.io', nom: 'X', prenom: 'Y' },
    });
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(getRenderWarnings()).toEqual([]);
  });

  it('ForceChangePasswordPage avec flags absents ne déclenche pas le warning React', () => {
    setStore({
      accessToken: 'fake',
      refreshToken: 'fake',
      user: { id: '1', email: 'x@y.io', nom: 'X', prenom: 'Y' },
      mdpExpire: false,
      doitChangerMdp: false,
    });
    render(
      <MemoryRouter initialEntries={['/change-mdp']}>
        <ForceChangePasswordPage />
      </MemoryRouter>,
    );
    expect(getRenderWarnings()).toEqual([]);
  });

  it('ForceChangePasswordPage avec doitChangerMdp=true rend la page sans warning', () => {
    setStore({
      accessToken: 'fake',
      refreshToken: 'fake',
      user: { id: '1', email: 'x@y.io', nom: 'X', prenom: 'Y' },
      mdpExpire: false,
      doitChangerMdp: true,
    });
    render(
      <MemoryRouter initialEntries={['/change-mdp']}>
        <ForceChangePasswordPage />
      </MemoryRouter>,
    );
    expect(getRenderWarnings()).toEqual([]);
  });
});
