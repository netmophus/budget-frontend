import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('@/lib/api/referentiels', () => ({
  importComptes: vi.fn(),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (m: string) => toastError(m),
    success: (m: string) => toastSuccess(m),
  },
}));

import { type ImportRapport, importComptes } from '@/lib/api/referentiels';
import { CompteImportDialog } from './CompteImportDialog';

const mockImport = importComptes as unknown as ReturnType<typeof vi.fn>;

function buildAxiosError(status: number, message: string): AxiosError {
  return new AxiosError(message, String(status), undefined, undefined, {
    status,
    data: { statusCode: status, message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() } as never,
  });
}

const RAPPORT_OK: ImportRapport = {
  totalLines: 5,
  imported: 5,
  updated: 0,
  skipped: 0,
  errors: [],
  dureeMs: 123,
};

const RAPPORT_PARTIEL: ImportRapport = {
  totalLines: 4,
  imported: 2,
  updated: 1,
  skipped: 0,
  errors: [
    {
      ligne: 3,
      codeCompte: '999',
      message: 'Parent inconnu : 998',
      code: 'PARENT_INCONNU',
    },
  ],
  dureeMs: 95,
};

describe('CompteImportDialog', () => {
  afterEach(() => {
    vi.clearAllMocks();
    // Radix Dialog utilise un Portal — sans cleanup explicite, des
    // dialogs précédents peuvent rester dans document.body et faire
    // échouer getByLabelText avec des matches multiples.
    cleanup();
  });

  // ─── Étape 1 : sélection

  it('étape 1 : titre + 2 modes radio + bouton Lancer désactivé sans fichier', () => {
    render(
      <CompteImportDialog
        isOpen
        onClose={vi.fn()}
        onImported={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Importer un fichier CSV \(PCB UMOA\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Insertion seulement/i)).toBeInTheDocument();
    expect(screen.getByText(/Mise à jour \(upsert\)/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Lancer l'import/i }),
    ).toBeDisabled();
  });

  it('étape 1 : sélection fichier active le bouton Lancer', () => {
    render(
      <CompteImportDialog
        isOpen
        onClose={vi.fn()}
        onImported={vi.fn()}
      />,
    );
    const input = screen.getByLabelText(/^Fichier CSV$/i) as HTMLInputElement;
    const file = new File(['code,libelle\n6,charges'], 'test.csv', {
      type: 'text/csv',
    });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/test\.csv/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Lancer l'import/i }),
    ).not.toBeDisabled();
  });

  // ─── Étape 3 : rapport

  it('rapport sans erreur : 4 KPI + message succès vert', async () => {
    mockImport.mockResolvedValue(RAPPORT_OK);
    const onImported = vi.fn();

    render(
      <CompteImportDialog
        isOpen
        onClose={vi.fn()}
        onImported={onImported}
      />,
    );
    const input = screen.getByLabelText(/^Fichier CSV$/i) as HTMLInputElement;
    const file = new File(['x'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(
      screen.getByRole('button', { name: /Lancer l'import/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/Import réussi/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/5 compte\(s\) créé\(s\)/)).toBeInTheDocument();
    expect(onImported).toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith(
      expect.stringMatching(/Import terminé.*5 créés/i),
    );
  });

  it('rapport avec erreurs : table d\'erreurs détaillées + toast rouge', async () => {
    mockImport.mockResolvedValue(RAPPORT_PARTIEL);

    render(
      <CompteImportDialog
        isOpen
        onClose={vi.fn()}
        onImported={vi.fn()}
      />,
    );
    const input = screen.getByLabelText(/^Fichier CSV$/i) as HTMLInputElement;
    const file = new File(['x'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(
      screen.getByRole('button', { name: /Lancer l'import/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/Erreurs détaillées/i)).toBeInTheDocument();
    });
    expect(screen.getByText('PARENT_INCONNU')).toBeInTheDocument();
    expect(screen.getByText(/Parent inconnu : 998/)).toBeInTheDocument();
    expect(toastError).toHaveBeenCalledWith(
      expect.stringMatching(/1 ligne\(s\) en erreur/i),
    );
  });

  it('400 backend : reste en étape 1, toast erreur explicite', async () => {
    mockImport.mockRejectedValue(
      buildAxiosError(400, 'Fichier CSV invalide (entête manquante)'),
    );

    render(
      <CompteImportDialog
        isOpen
        onClose={vi.fn()}
        onImported={vi.fn()}
      />,
    );
    const input = screen.getByLabelText(/^Fichier CSV$/i) as HTMLInputElement;
    const file = new File(['x'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(
      screen.getByRole('button', { name: /Lancer l'import/i }),
    );

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        expect.stringMatching(/Fichier CSV invalide/i),
      );
    });
    // Reste en étape 1 (le bouton Lancer est toujours là)
    expect(
      screen.getByRole('button', { name: /Lancer l'import/i }),
    ).toBeInTheDocument();
  });

  it('Fermer après rapport : appelle onClose', async () => {
    mockImport.mockResolvedValue(RAPPORT_OK);
    const onClose = vi.fn();

    render(
      <CompteImportDialog
        isOpen
        onClose={onClose}
        onImported={vi.fn()}
      />,
    );
    const input = screen.getByLabelText(/^Fichier CSV$/i) as HTMLInputElement;
    const file = new File(['x'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(
      screen.getByRole('button', { name: /Lancer l'import/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/Import réussi/i)).toBeInTheDocument();
    });
    // Dialog Radix expose aussi une croix "Fermer" sr-only ; on cible
    // précisément le bouton du DialogFooter via getAllBy + dernier match.
    const fermerButtons = screen.getAllByRole('button', {
      name: /^Fermer$/i,
    });
    fireEvent.click(fermerButtons[fermerButtons.length - 1]!);
    expect(onClose).toHaveBeenCalled();
  });

  it('Annuler en étape 1 : appelle onClose', () => {
    const onClose = vi.fn();
    render(
      <CompteImportDialog
        isOpen
        onClose={onClose}
        onImported={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Annuler/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
