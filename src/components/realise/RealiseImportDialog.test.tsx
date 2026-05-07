/**
 * Tests Vitest RealiseImportDialog (Lot 5.1.B).
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/realise', () => ({
  importerRealise: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { importerRealise } from '@/lib/api/realise';
import { RealiseImportDialog } from './RealiseImportDialog';

const mockImporter = importerRealise as unknown as ReturnType<typeof vi.fn>;

function makeFile(name: string, sizeBytes: number, content = 'header'): File {
  const blob = new Blob([content], { type: 'text/csv' });
  const f = new File([blob], name);
  // Override `size` car les tests jsdom ne peuvent pas fabriquer de
  // gros fichiers facilement.
  Object.defineProperty(f, 'size', { value: sizeBytes });
  return f;
}

describe('RealiseImportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  function renderDialog() {
    render(
      <RealiseImportDialog
        isOpen={true}
        onClose={() => {}}
        onImported={() => {}}
      />,
    );
  }

  it('refuse un fichier .txt non supporté', () => {
    renderDialog();
    const input = screen.getByTestId('input-file') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [makeFile('file.txt', 1000)] },
    });
    expect(screen.getByTestId('erreur-fichier')).toHaveTextContent(
      'Format non supporté',
    );
    expect(screen.getByTestId('btn-lancer-import')).toBeDisabled();
  });

  it('refuse un fichier > 10 MB', () => {
    renderDialog();
    const input = screen.getByTestId('input-file') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [makeFile('big.csv', 11 * 1024 * 1024)] },
    });
    expect(screen.getByTestId('erreur-fichier')).toHaveTextContent(
      'trop volumineux',
    );
    expect(screen.getByTestId('btn-lancer-import')).toBeDisabled();
  });

  it('accepte un .csv valide → bouton Lancer activé + file-info', () => {
    renderDialog();
    const input = screen.getByTestId('input-file') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [makeFile('realise.csv', 1024)] },
    });
    expect(screen.getByTestId('file-info')).toBeInTheDocument();
    expect(screen.getByTestId('btn-lancer-import')).not.toBeDisabled();
  });

  it("rapport affiche les 4 compteurs après import", async () => {
    mockImporter.mockResolvedValue({
      nbLignesTraitees: 10,
      nbLignesCreees: 7,
      nbLignesMisesAJour: 2,
      nbLignesIgnorees: 1,
      nbErreurs: 0,
      erreurs: [],
      lignesIgnorees: [{ ligne: 5, raison: 'Hors périmètre' }],
    });
    renderDialog();
    fireEvent.change(screen.getByTestId('input-file'), {
      target: { files: [makeFile('realise.csv', 1024)] },
    });
    fireEvent.click(screen.getByTestId('btn-lancer-import'));
    await waitFor(() =>
      expect(screen.getByTestId('zone-rapport')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('rapport-creees')).toHaveTextContent('7');
    expect(screen.getByTestId('rapport-maj')).toHaveTextContent('2');
    expect(screen.getByTestId('rapport-ignorees')).toHaveTextContent('1');
    expect(screen.getByTestId('rapport-erreurs')).toHaveTextContent('0');
  });

  it("tableau erreurs affiché si nbErreurs > 0", async () => {
    mockImporter.mockResolvedValue({
      nbLignesTraitees: 5,
      nbLignesCreees: 3,
      nbLignesMisesAJour: 0,
      nbLignesIgnorees: 0,
      nbErreurs: 2,
      erreurs: [
        { ligne: 2, message: 'Code CR inconnu' },
        { ligne: 4, message: 'Mois mal formé' },
      ],
      lignesIgnorees: [],
    });
    renderDialog();
    fireEvent.change(screen.getByTestId('input-file'), {
      target: { files: [makeFile('realise.csv', 1024)] },
    });
    fireEvent.click(screen.getByTestId('btn-lancer-import'));
    await waitFor(() => screen.getByTestId('zone-erreurs'));
    expect(screen.getByText('Code CR inconnu')).toBeInTheDocument();
    expect(screen.getByText('Mois mal formé')).toBeInTheDocument();
  });
});
