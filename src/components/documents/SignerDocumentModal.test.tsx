/**
 * Tests Vitest SignerDocumentModal (Lot 8.2.B Palier 4).
 *
 * 2 tests :
 *  1. Checkbox non cochée → bouton "Signer définitivement" disabled
 *     même si mot de passe rempli (preuve UX : 2 contrôles obligatoires)
 *  2. Mot de passe invalide (mock 401 axios) → toast "Mot de passe
 *     incorrect" + champ pas vidé (UX : retry possible) + onSigned
 *     PAS appelé
 */
import { AxiosError } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/documents', () => ({
  signerDocument: vi.fn(),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => toastSuccess(m),
    error: (m: string) => toastError(m),
    info: vi.fn(),
  },
}));

import { signerDocument } from '@/lib/api/documents';
import { fireEvent, render, screen, waitFor } from '@/test/test-utils';

import { SignerDocumentModal } from './SignerDocumentModal';

const mockSigner = signerDocument as unknown as ReturnType<typeof vi.fn>;

describe('SignerDocumentModal (Lot 8.2.B P4)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1. checkbox non cochée → bouton "Signer" disabled même avec mdp rempli', () => {
    render(
      <SignerDocumentModal
        open
        onClose={() => {}}
        documentId="doc-1"
        codeDocument="LETTRE_2026"
        titre="Lettre cadrage 2026"
        onSigned={() => {}}
      />,
    );
    // Encart visible
    expect(screen.getByTestId('encart-irreversible')).toBeInTheDocument();
    // Sans rien → disabled
    expect(screen.getByTestId('btn-submit-signer')).toBeDisabled();
    // Avec mdp seul mais sans checkbox → toujours disabled
    fireEvent.change(screen.getByTestId('input-mdp'), {
      target: { value: 'secret-test' },
    });
    expect(screen.getByTestId('btn-submit-signer')).toBeDisabled();
    // Checkbox seule sans mdp → toujours disabled
    fireEvent.change(screen.getByTestId('input-mdp'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByTestId('checkbox-confirme'));
    expect(screen.getByTestId('btn-submit-signer')).toBeDisabled();
    // Les 2 ensemble → bouton actif
    fireEvent.change(screen.getByTestId('input-mdp'), {
      target: { value: 'secret-test' },
    });
    expect(screen.getByTestId('btn-submit-signer')).not.toBeDisabled();
  });

  it('2. mot de passe invalide (401) → toast erreur + champ pas vidé + onSigned PAS appelé', async () => {
    const onSigned = vi.fn();
    const err401 = new AxiosError('Unauthorized');
    Object.defineProperty(err401, 'response', {
      value: { status: 401, data: { message: 'Mot de passe invalide.' } },
    });
    mockSigner.mockRejectedValue(err401);

    render(
      <SignerDocumentModal
        open
        onClose={() => {}}
        documentId="doc-1"
        codeDocument="LETTRE_2026"
        titre="Lettre cadrage 2026"
        onSigned={onSigned}
      />,
    );

    fireEvent.change(screen.getByTestId('input-mdp'), {
      target: { value: 'mauvais-mdp' },
    });
    fireEvent.click(screen.getByTestId('checkbox-confirme'));
    fireEvent.click(screen.getByTestId('btn-submit-signer'));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Mot de passe incorrect.');
    });
    // Pas de clear : l'utilisateur peut retenter
    expect(
      (screen.getByTestId('input-mdp') as HTMLInputElement).value,
    ).toBe('mauvais-mdp');
    expect(onSigned).not.toHaveBeenCalled();
  });
});
