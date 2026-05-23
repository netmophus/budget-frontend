/**
 * Tests Vitest UploaderFichierModal (Lot 8.2.B Palier 3).
 *
 * 3 tests :
 *  1. Fichier non-PDF (text/plain) → erreur client visible + bouton
 *     submit disabled + API jamais appelée
 *  2. Fichier PDF > 10 MB → erreur client visible + submit disabled
 *  3. Upload OK : appel uploadFichierDocument + toast + onUploaded
 *     callback + onClose
 *
 * Bonus implicite : le mode remplacement (fichierJointNom non-null)
 * affiche le warning AlertTriangle — testé en setup mais pas dans un
 * test dédié pour rester sur 3 cas comme la mission.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/documents', () => ({
  uploadFichierDocument: vi.fn(),
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

import { uploadFichierDocument } from '@/lib/api/documents';
import { fireEvent, render, screen, waitFor } from '@/test/test-utils';

import { UploaderFichierModal } from './UploaderFichierModal';

const mockUpload = uploadFichierDocument as unknown as ReturnType<
  typeof vi.fn
>;

function makePdfFile(name = 'doc.pdf', sizeBytes = 1024): File {
  const file = new File(['%PDF-1.4 fake'], name, {
    type: 'application/pdf',
  });
  // jsdom : `size` est computed depuis le contenu — on force pour
  // simuler un fichier volumineux sans réellement allouer N MB.
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

function makeNonPdfFile(name = 'doc.txt'): File {
  return new File(['hello'], name, { type: 'text/plain' });
}

describe('UploaderFichierModal (Lot 8.2.B P3)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('1. fichier non-PDF → erreur client visible + submit disabled + API jamais appelée', async () => {
    render(
      <UploaderFichierModal
        open
        onClose={() => {}}
        documentId="doc-1"
        fichierJointNom={null}
        onUploaded={() => {}}
      />,
    );
    const input = screen.getByTestId('input-fichier') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeNonPdfFile()] } });
    await waitFor(() => {
      expect(screen.getByTestId('erreur-client')).toBeInTheDocument();
    });
    expect(screen.getByTestId('erreur-client').textContent).toMatch(
      /PDF/i,
    );
    expect(screen.getByTestId('btn-submit-upload')).toBeDisabled();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('2. fichier PDF > 10 MB → erreur client + submit disabled', async () => {
    render(
      <UploaderFichierModal
        open
        onClose={() => {}}
        documentId="doc-1"
        fichierJointNom={null}
        onUploaded={() => {}}
      />,
    );
    const bigPdf = makePdfFile('big.pdf', 11 * 1024 * 1024); // 11 MB
    const input = screen.getByTestId('input-fichier') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [bigPdf] } });
    await waitFor(() => {
      expect(screen.getByTestId('erreur-client')).toBeInTheDocument();
    });
    expect(screen.getByTestId('erreur-client').textContent).toMatch(
      /10 MB/i,
    );
    expect(screen.getByTestId('btn-submit-upload')).toBeDisabled();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('3. upload OK : appel API + toast + callbacks onUploaded + onClose', async () => {
    const onClose = vi.fn();
    const onUploaded = vi.fn();
    mockUpload.mockResolvedValue({
      documentId: 'doc-1',
      fichierNom: 'lettre.pdf',
      fichierTaille: 5120,
      dateUpload: '2026-05-23T10:00:00Z',
    });
    render(
      <UploaderFichierModal
        open
        onClose={onClose}
        documentId="doc-1"
        fichierJointNom={null}
        onUploaded={onUploaded}
      />,
    );
    const goodPdf = makePdfFile('lettre.pdf', 5120);
    const input = screen.getByTestId('input-fichier') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [goodPdf] } });
    await waitFor(() => {
      expect(screen.getByTestId('fichier-selected')).toBeInTheDocument();
    });
    expect(screen.getByTestId('btn-submit-upload')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('btn-submit-upload'));
    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith('doc-1', goodPdf);
    });
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('lettre.pdf'),
      );
    });
    expect(onUploaded).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('bonus : mode remplacement affiche warning + nom ancien fichier', () => {
    render(
      <UploaderFichierModal
        open
        onClose={() => {}}
        documentId="doc-1"
        fichierJointNom="ancien.pdf"
        onUploaded={() => {}}
      />,
    );
    expect(screen.getByTestId('warning-replacement')).toBeInTheDocument();
    expect(screen.getByText(/ancien\.pdf/)).toBeInTheDocument();
    expect(screen.getByText('Remplacer le PDF')).toBeInTheDocument();
  });
});
