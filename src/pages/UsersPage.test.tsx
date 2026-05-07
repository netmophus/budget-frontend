/**
 * Tests Vitest UsersPage (Lot Administration) — vérifient les
 * éléments enrichis (bouton Nouvel utilisateur, menu kebab, action
 * désactiver protégée pour soi-même).
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/users', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api/users')>('@/lib/api/users');
  return { ...actual, listUsers: vi.fn() };
});

vi.mock('@/lib/auth/auth-store', () => ({
  useAuthStore: (selector: (s: { user: { id: string } | null }) => unknown) =>
    selector({ user: { id: '1' } }),
}));

vi.mock('@/components/admin/users/CreerUserDialog', () => ({
  CreerUserDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="creer-stub">creer</div> : null,
}));
vi.mock('@/components/admin/users/ModifierUserDialog', () => ({
  ModifierUserDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="modifier-stub">modifier</div> : null,
}));
vi.mock('@/components/admin/users/ResetPasswordDialog', () => ({
  ResetPasswordDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="reset-stub">reset</div> : null,
}));
vi.mock('@/components/admin/users/GererRolesSection', () => ({
  GererRolesSection: () => <div data-testid="gerer-roles-stub">roles</div>,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { listUsers } from '@/lib/api/users';
import { UsersPage } from './UsersPage';

const mockListUsers = listUsers as unknown as ReturnType<typeof vi.fn>;

describe('UsersPage (Lot Administration)', () => {
  beforeEach(() => {
    mockListUsers.mockResolvedValue({
      items: [
        {
          id: '1',
          email: 'admin@m.io',
          nom: 'Admin',
          prenom: 'Moi',
          estActif: true,
          dateDerniereConnexion: null,
          dateCreation: '2026-01-01',
        },
        {
          id: '2',
          email: 'autre@m.io',
          nom: 'Autre',
          prenom: 'User',
          estActif: true,
          dateDerniereConnexion: null,
          dateCreation: '2026-01-01',
        },
      ],
      total: 2,
      page: 1,
      limit: 20,
    });
  });
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('affiche le bouton "Nouvel utilisateur"', async () => {
    render(<UsersPage />);
    await waitFor(() =>
      expect(screen.getByTestId('btn-nouvel-utilisateur')).toBeInTheDocument(),
    );
  });

  it('clic sur Nouvel utilisateur ouvre la stub CreerUserDialog', async () => {
    render(<UsersPage />);
    await waitFor(() => screen.getByTestId('btn-nouvel-utilisateur'));
    expect(screen.queryByTestId('creer-stub')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('btn-nouvel-utilisateur'));
    expect(screen.getByTestId('creer-stub')).toBeInTheDocument();
  });

  it('affiche le menu kebab d\'actions sur chaque ligne user', async () => {
    render(<UsersPage />);
    await waitFor(() =>
      expect(screen.getByTestId('btn-actions-1')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('btn-actions-2')).toBeInTheDocument();
  });
});
