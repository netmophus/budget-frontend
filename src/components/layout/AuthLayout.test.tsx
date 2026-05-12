/**
 * Tests Vitest AuthLayout — UX A.4 sidebar scrollable + groupes
 * collapsibles persistantes.
 *
 * On stubbe le store auth (utilisateur connecté admin global) et
 * permissions hook (autorise tout) pour que tous les groupes
 * s'affichent.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/auth/permissions', () => ({
  useHasPermission: () => true,
}));

vi.mock('@/lib/auth/auth-store', () => ({
  useAuthStore: () => ({
    user: { prenom: 'Admin', nom: 'Test', email: 'admin@miznas.local' },
    roles: ['ADMIN'],
    logout: vi.fn(),
  }),
  // Lot 6.7.1 — AuthLayout rend <BandeauMdpExpire /> qui consomme ce hook.
  useMdpExpireProchainement: () => false,
}));

import { AuthLayout } from './AuthLayout';

const SIDEBAR_KEY = 'sidebar-group-states-v1';

describe('AuthLayout — sidebar collapsible (UX A.4)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('affiche les 4 groupes (Référentiels / Budget / Configuration / Administration)', () => {
    render(
      <MemoryRouter>
        <AuthLayout />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('nav-group-referentiels')).toBeInTheDocument();
    expect(screen.getByTestId('nav-group-budget')).toBeInTheDocument();
    expect(screen.getByTestId('nav-group-configuration')).toBeInTheDocument();
    expect(screen.getByTestId('nav-group-administration')).toBeInTheDocument();
  });

  it('par défaut tous les groupes sont déployés (aria-expanded=true)', () => {
    render(
      <MemoryRouter>
        <AuthLayout />
      </MemoryRouter>,
    );
    const toggle = screen.getByTestId('nav-group-toggle-budget');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('clic sur le titre d\'un groupe → toggle aria-expanded + persiste localStorage', () => {
    render(
      <MemoryRouter>
        <AuthLayout />
      </MemoryRouter>,
    );
    const toggle = screen.getByTestId('nav-group-toggle-budget');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    // Persistance
    const raw = window.localStorage.getItem(SIDEBAR_KEY);
    expect(raw).not.toBeNull();
    const state = JSON.parse(raw!);
    expect(state.budget).toBe(false);
  });

  it('hydrate l\'état initial depuis localStorage (budget fermé)', () => {
    window.localStorage.setItem(
      SIDEBAR_KEY,
      JSON.stringify({ budget: false }),
    );
    render(
      <MemoryRouter>
        <AuthLayout />
      </MemoryRouter>,
    );
    const toggle = screen.getByTestId('nav-group-toggle-budget');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it("aside a la classe 'overflow-y-auto' (scroll vertical)", () => {
    const { container } = render(
      <MemoryRouter>
        <AuthLayout />
      </MemoryRouter>,
    );
    const aside = container.querySelector('aside');
    expect(aside).not.toBeNull();
    expect(aside!.className).toMatch(/overflow-y-auto/);
  });
});
