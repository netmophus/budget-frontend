/**
 * Tests Vitest AffectationsPage (Lot 4.1-fix.A).
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/users', () => ({
  listUsers: vi.fn(),
}));

vi.mock('@/components/admin/AffectationsDialog', () => ({
  AffectationsDialog: ({
    isOpen,
    userId,
  }: {
    isOpen: boolean;
    userId: string | null;
  }) =>
    isOpen ? (
      <div data-testid="dialog-stub" data-user={userId ?? 'none'}>
        dialog
      </div>
    ) : null,
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import type { UserResponse } from '@/lib/api/types';
import { listUsers } from '@/lib/api/users';
import { AffectationsPage } from './AffectationsPage';

const mockListUsers = listUsers as unknown as ReturnType<typeof vi.fn>;

function makeUser(over: Partial<UserResponse> = {}): UserResponse {
  return {
    id: '1',
    email: 'test@miznas.local',
    nom: 'Test',
    prenom: 'User',
    estActif: true,
    dateDerniereConnexion: null,
    dateCreation: '2026-01-01T00:00:00Z',
    ...over,
  };
}

describe('AffectationsPage (Lot 4.1-fix)', () => {
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('appelle listUsers avec withPerimetresCount=true et estActif=true', async () => {
    mockListUsers.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 100,
    });
    render(<AffectationsPage />);
    await waitFor(() =>
      expect(mockListUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          withPerimetresCount: true,
          estActif: true,
        }),
      ),
    );
  });

  it('liste TOUS les users dont ceux à 0 périmètre', async () => {
    mockListUsers.mockResolvedValue({
      items: [
        makeUser({ id: '1', prenom: 'Amadou', nom: 'Directeur', email: 'dir@miznas.local', nombrePerimetresActifs: 0 }),
        makeUser({ id: '2', prenom: 'Aïcha', nom: 'CDG', email: 'cdg@miznas.local', nombrePerimetresActifs: 2 }),
      ],
      total: 2,
      page: 1,
      limit: 100,
    });
    render(<AffectationsPage />);
    await waitFor(() =>
      expect(screen.getByText('dir@miznas.local')).toBeInTheDocument(),
    );
    expect(screen.getByText('cdg@miznas.local')).toBeInTheDocument();
    // Badge "0 périmètre" pour le user 1
    expect(screen.getByTestId('badge-zero-1')).toBeInTheDocument();
    // Badge "2 périmètres" pour le user 2
    expect(screen.getByTestId('badge-count-2').textContent).toMatch(
      /2 périmètres/,
    );
  });

  it('Bouton "Ajouter une affectation" visible pour les users à 0 périmètre', async () => {
    mockListUsers.mockResolvedValue({
      items: [
        makeUser({ id: '1', nombrePerimetresActifs: 0 }),
        makeUser({ id: '2', nombrePerimetresActifs: 1 }),
      ],
      total: 2,
      page: 1,
      limit: 100,
    });
    render(<AffectationsPage />);
    await waitFor(() =>
      expect(screen.getByTestId('btn-ajouter-1')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('btn-ajouter-1').textContent).toMatch(
      /Ajouter une affectation/,
    );
    // user 2 → bouton "Gérer", pas "Ajouter"
    expect(screen.queryByTestId('btn-ajouter-2')).not.toBeInTheDocument();
    expect(screen.getByTestId('btn-gerer-2')).toBeInTheDocument();
  });

  it('clic sur "Ajouter une affectation" ouvre le dialog avec userId', async () => {
    mockListUsers.mockResolvedValue({
      items: [makeUser({ id: '7', nombrePerimetresActifs: 0 })],
      total: 1,
      page: 1,
      limit: 100,
    });
    render(<AffectationsPage />);
    await waitFor(() =>
      expect(screen.getByTestId('btn-ajouter-7')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('btn-ajouter-7'));
    expect(screen.getByTestId('dialog-stub').getAttribute('data-user')).toBe(
      '7',
    );
  });

  it('filtre email débounced (transmet la valeur à listUsers)', async () => {
    mockListUsers.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 100,
    });
    render(<AffectationsPage />);
    await waitFor(() => expect(mockListUsers).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByTestId('input-email-filter'), {
      target: { value: 'dir' },
    });
    // Debounce 300 ms — on attend que l'appel arrive
    await waitFor(
      () => {
        const last = mockListUsers.mock.calls.at(-1)?.[0];
        expect(last).toEqual(expect.objectContaining({ email: 'dir' }));
      },
      { timeout: 1000 },
    );
  });
});
