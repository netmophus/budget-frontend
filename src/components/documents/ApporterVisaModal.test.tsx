/**
 * Tests Vitest ApporterVisaModal (Lot 8.2.B Palier 4).
 *
 * 2 tests :
 *  1. Mode REJETER sans commentaire → erreur Zod "Commentaire
 *     obligatoire" affichée + apporterVisa JAMAIS appelé
 *  2. Mode REJETER avec commentaire → apporterVisa appelé avec
 *     action=REJETER + commentaire + toast + onSubmitted + onClose
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/documents', () => ({
  apporterVisa: vi.fn(),
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

import { apporterVisa } from '@/lib/api/documents';
import { fireEvent, render, screen, waitFor } from '@/test/test-utils';

import { ApporterVisaModal } from './ApporterVisaModal';

const mockApporterVisa = apporterVisa as unknown as ReturnType<
  typeof vi.fn
>;

describe('ApporterVisaModal (Lot 8.2.B P4)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1. mode REJETER sans commentaire → erreur Zod + API jamais appelée', async () => {
    render(
      <ApporterVisaModal
        open
        onClose={() => {}}
        documentId="doc-1"
        codeDocument="LETTRE_2026"
        onSubmitted={() => {}}
      />,
    );
    // Switch sur mode REJETER
    fireEvent.click(screen.getByTestId('radio-rejeter'));
    // Le warning apparaît
    await waitFor(() => {
      expect(screen.getByTestId('warning-rejet')).toBeInTheDocument();
    });
    // Submit sans commentaire
    fireEvent.click(screen.getByTestId('btn-submit-visa'));
    await waitFor(() => {
      expect(screen.getByTestId('err-commentaire')).toBeInTheDocument();
    });
    expect(screen.getByTestId('err-commentaire').textContent).toMatch(
      /obligatoire/i,
    );
    expect(mockApporterVisa).not.toHaveBeenCalled();
  });

  it('2. mode REJETER avec commentaire → apporterVisa appelé + toast + callbacks', async () => {
    const onClose = vi.fn();
    const onSubmitted = vi.fn();
    mockApporterVisa.mockResolvedValue({
      id: 'doc-1',
      statut: 'BROUILLON',
    });
    render(
      <ApporterVisaModal
        open
        onClose={onClose}
        documentId="doc-1"
        codeDocument="LETTRE_2026"
        onSubmitted={onSubmitted}
      />,
    );
    fireEvent.click(screen.getByTestId('radio-rejeter'));
    fireEvent.change(screen.getByTestId('textarea-commentaire'), {
      target: { value: 'Corriger le paragraphe 3.' },
    });
    fireEvent.click(screen.getByTestId('btn-submit-visa'));
    await waitFor(() => {
      expect(mockApporterVisa).toHaveBeenCalledWith('doc-1', {
        action: 'REJETER',
        commentaire: 'Corriger le paragraphe 3.',
      });
    });
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('rejeté'),
      );
    });
    expect(onSubmitted).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
