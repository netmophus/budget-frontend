/**
 * Tests Vitest ResetPasswordDialog (Lot Administration ADMIN.A,
 * refactor Lot 6.4.C).
 *
 * Lot 6.4.C — la réponse API ne retourne plus le mdp en clair.
 * Le dialog affiche désormais juste un message "Email envoyé à
 * <email>" et un toast. Pas de bouton "Copier", pas de mdp visible.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/users', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api/users')>('@/lib/api/users');
  return { ...actual, resetPasswordUser: vi.fn() };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { resetPasswordUser } from '@/lib/api/users';
import { toast } from 'sonner';
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
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('affiche la confirmation initialement (pas de mdp visible)', () => {
    render(
      <ResetPasswordDialog
        isOpen={true}
        onClose={() => {}}
        user={user}
      />,
    );
    expect(screen.getByTestId('btn-confirmer-reset')).toBeInTheDocument();
    // Le bouton Copier n'existe plus (Lot 6.4.C — mdp jamais affiché).
    expect(screen.queryByTestId('btn-copier-mdp')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mdp-genere')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reset-confirmation')).not.toBeInTheDocument();
  });

  it("confirmation : appelle l'API et affiche le message Email envoyé (sans mdp)", async () => {
    mockReset.mockResolvedValue({
      success: true,
      message: 'Email de réinitialisation envoyé à cible@m.io.',
    });
    render(
      <ResetPasswordDialog isOpen={true} onClose={() => {}} user={user} />,
    );
    fireEvent.click(screen.getByTestId('btn-confirmer-reset'));
    await waitFor(() =>
      expect(screen.getByTestId('reset-confirmation')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('reset-confirmation')).toHaveTextContent(
      'cible@m.io',
    );
    expect(mockReset).toHaveBeenCalledWith('5');
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('cible@m.io'),
    );
    // SÉCURITÉ : aucune occurrence d'un mdp en clair dans le DOM
    // (le DOM ne contient que le message + l'email du destinataire).
    expect(screen.queryByTestId('mdp-genere')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-copier-mdp')).not.toBeInTheDocument();
  });

  it("erreur API : affiche un toast d'erreur sans crash", async () => {
    mockReset.mockRejectedValue(new Error('Boom'));
    render(
      <ResetPasswordDialog isOpen={true} onClose={() => {}} user={user} />,
    );
    fireEvent.click(screen.getByTestId('btn-confirmer-reset'));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Boom')),
    );
    // Pas de transition vers le state "email envoyé" en cas d'erreur.
    expect(screen.queryByTestId('reset-confirmation')).not.toBeInTheDocument();
  });
});
