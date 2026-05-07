/**
 * Tests Vitest ResetPasswordDialog (Lot Administration ADMIN.A).
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
  return { ...actual, resetPasswordUser: vi.fn() };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { resetPasswordUser } from '@/lib/api/users';
import { ResetPasswordDialog } from './ResetPasswordDialog';

const mockReset = resetPasswordUser as unknown as ReturnType<typeof vi.fn>;

const user = {
  id: '5',
  email: 'cible@m.io',
  nom: 'X',
  prenom: 'Y',
  estActif: true,
  dateDerniereConnexion: null,
  dateCreation: '2026-01-01',
};

describe('ResetPasswordDialog', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('affiche la confirmation initialement (pas de mot de passe)', () => {
    render(
      <ResetPasswordDialog
        isOpen={true}
        onClose={() => {}}
        user={user}
      />,
    );
    expect(screen.getByTestId('btn-confirmer-reset')).toBeInTheDocument();
    expect(screen.queryByTestId('mdp-genere')).not.toBeInTheDocument();
  });

  it('confirmation : appelle l\'API et affiche le mot de passe généré', async () => {
    mockReset.mockResolvedValue({
      motDePasseTemporaire: 'TempXyz!9876',
      message: 'OK',
    });
    render(
      <ResetPasswordDialog isOpen={true} onClose={() => {}} user={user} />,
    );
    fireEvent.click(screen.getByTestId('btn-confirmer-reset'));
    await waitFor(() =>
      expect(screen.getByTestId('mdp-genere')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('mdp-genere')).toHaveTextContent('TempXyz!9876');
    expect(mockReset).toHaveBeenCalledWith('5');
  });

  it('bouton Copier appelle navigator.clipboard.writeText', async () => {
    mockReset.mockResolvedValue({
      motDePasseTemporaire: 'TempAbc!1234',
      message: 'OK',
    });
    render(
      <ResetPasswordDialog isOpen={true} onClose={() => {}} user={user} />,
    );
    fireEvent.click(screen.getByTestId('btn-confirmer-reset'));
    await waitFor(() => screen.getByTestId('btn-copier-mdp'));
    fireEvent.click(screen.getByTestId('btn-copier-mdp'));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('TempAbc!1234'),
    );
  });
});
