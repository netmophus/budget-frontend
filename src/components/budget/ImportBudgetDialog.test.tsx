/**
 * Tests Vitest ImportBudgetDialog (Lot 3.7).
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('@/lib/api/budget-import', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/budget-import')
  >('@/lib/api/budget-import');
  return {
    ...actual,
    importBudget: vi.fn(),
  };
});

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => toastSuccess(m),
    error: (m: string) => toastError(m),
  },
}));

import {
  importBudget,
  type ImportBudgetRapport,
} from '@/lib/api/budget-import';
import { ImportBudgetDialog } from './ImportBudgetDialog';

const mockImport = importBudget as unknown as ReturnType<typeof vi.fn>;

const RAPPORT_OK: ImportBudgetRapport = {
  fichier: 'budget.csv',
  tailleKo: 1,
  formatDetecte: 'csv',
  lignesTotal: 5,
  lignesValides: 5,
  lignesInserees: 5,
  lignesModifiees: 0,
  lignesIgnorees: 0,
  lignesRejetees: 0,
  erreurs: [],
  warnings: [],
  dureeMs: 42,
  transactionRollback: false,
};

const RAPPORT_AVEC_ERREURS: ImportBudgetRapport = {
  ...RAPPORT_OK,
  lignesTotal: 8,
  lignesValides: 5,
  lignesInserees: 5,
  lignesRejetees: 3,
  erreurs: [
    {
      ligneNumero: 6,
      code: 'CR_INTROUVABLE',
      message: 'CR \'BR_INCONNU\' introuvable.',
    },
    {
      ligneNumero: 7,
      code: 'COMPTE_INTROUVABLE',
      message: 'Compte 999999 introuvable.',
    },
    {
      ligneNumero: 8,
      code: 'COMPTE_AGREGE',
      message: 'Saisie sur compte agrégé interdite.',
    },
  ],
};

const RAPPORT_ROLLBACK: ImportBudgetRapport = {
  ...RAPPORT_AVEC_ERREURS,
  lignesInserees: 0,
  transactionRollback: true,
};

function buildAxiosError(status: number, message: string): AxiosError {
  return new AxiosError(message, String(status), undefined, undefined, {
    status,
    data: { statusCode: status, message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() } as never,
  });
}

function makeFile(name: string): File {
  return new File(['content'], name, { type: 'text/csv' });
}

describe('ImportBudgetDialog', () => {
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('Étape sélection : drop zone visible + bouton Parcourir', () => {
    render(
      <ImportBudgetDialog
        isOpen
        onClose={vi.fn()}
        versionId="10"
        versionCode="BI_2027"
        scenarioId="100"
        scenarioCode="MEDIAN_2027"
      />,
    );
    expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
    expect(screen.getByTestId('btn-parcourir')).toBeInTheDocument();
    // bouton Importer désactivé tant qu'aucun fichier choisi
    expect(screen.getByTestId('btn-importer')).toBeDisabled();
  });

  it("Sélection d'un .csv + cochage confirmation → bouton Importer actif", () => {
    render(
      <ImportBudgetDialog
        isOpen
        onClose={vi.fn()}
        versionId="10"
        scenarioId="100"
      />,
    );
    const input = screen.getByTestId('input-file') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('budget.csv')] } });
    expect(screen.getByTestId('file-selected')).toBeInTheDocument();
    // UX C.1 — bouton encore désactivé sans confirmation explicite.
    expect(screen.getByTestId('btn-importer')).toBeDisabled();
    fireEvent.click(screen.getByTestId('checkbox-confirmation'));
    expect(screen.getByTestId('btn-importer')).not.toBeDisabled();
  });

  // ─── UX C.1 — bandeau contexte + checkbox de confirmation ─────────

  it("C.1 — bandeau de contexte affiche libellés Version + Scénario", () => {
    render(
      <ImportBudgetDialog
        isOpen
        onClose={vi.fn()}
        versionId="10"
        versionCode="BI_2027"
        versionLibelle="Budget initial 2027"
        scenarioId="100"
        scenarioCode="MEDIAN_2027"
        scenarioLibelle="Scénario médian 2027"
      />,
    );
    expect(screen.getByTestId('bandeau-contexte')).toBeInTheDocument();
    expect(screen.getByTestId('contexte-version-libelle').textContent).toBe(
      'Budget initial 2027',
    );
    expect(screen.getByTestId('contexte-scenario-libelle').textContent).toBe(
      'Scénario médian 2027',
    );
  });

  it("C.1 — bouton Importer reste désactivé sans cochage, même fichier sélectionné", () => {
    render(
      <ImportBudgetDialog
        isOpen
        onClose={vi.fn()}
        versionId="10"
        scenarioId="100"
        scenarioLibelle="Scénario médian 2027"
      />,
    );
    fireEvent.change(screen.getByTestId('input-file'), {
      target: { files: [makeFile('budget.csv')] },
    });
    expect(screen.getByTestId('btn-importer')).toBeDisabled();
    // s'active au cochage
    fireEvent.click(screen.getByTestId('checkbox-confirmation'));
    expect(screen.getByTestId('btn-importer')).not.toBeDisabled();
    // se désactive si on décoche
    fireEvent.click(screen.getByTestId('checkbox-confirmation'));
    expect(screen.getByTestId('btn-importer')).toBeDisabled();
  });

  it('Bouton « Télécharger le template » crée un blob CSV (lien <a>)', () => {
    // jsdom n'a pas URL.createObjectURL — on stubbe pour valider l'appel.
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:http://test/x');
    const revokeSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    render(
      <ImportBudgetDialog
        isOpen
        onClose={vi.fn()}
        versionId="10"
        scenarioId="100"
      />,
    );
    fireEvent.click(screen.getByTestId('btn-template'));
    expect(createSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalled();
    createSpy.mockRestore();
    revokeSpy.mockRestore();
  });

  it('Upload réussi → étape rapport avec stats success', async () => {
    mockImport.mockResolvedValue(RAPPORT_OK);
    render(
      <ImportBudgetDialog
        isOpen
        onClose={vi.fn()}
        versionId="10"
        scenarioId="100"
      />,
    );
    const input = screen.getByTestId('input-file') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('budget.csv')] } });
    fireEvent.click(screen.getByTestId('checkbox-confirmation'));
    fireEvent.click(screen.getByTestId('btn-importer'));
    await waitFor(() =>
      expect(screen.getByTestId('etape-rapport')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('success-alert')).toBeInTheDocument();
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('Rapport avec erreurs → tableau erreurs visible', async () => {
    mockImport.mockResolvedValue(RAPPORT_AVEC_ERREURS);
    render(
      <ImportBudgetDialog
        isOpen
        onClose={vi.fn()}
        versionId="10"
        scenarioId="100"
      />,
    );
    fireEvent.change(screen.getByTestId('input-file'), {
      target: { files: [makeFile('budget.csv')] },
    });
    fireEvent.click(screen.getByTestId('checkbox-confirmation'));
    fireEvent.click(screen.getByTestId('btn-importer'));
    await waitFor(() =>
      expect(screen.getByTestId('erreurs-table')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('erreur-ligne-6')).toBeInTheDocument();
    expect(screen.getByTestId('erreur-ligne-7')).toBeInTheDocument();
    expect(screen.getByTestId('erreur-ligne-8')).toBeInTheDocument();
  });

  it('Rapport rollback → bandeau rouge "Trop d\'erreurs"', async () => {
    mockImport.mockResolvedValue(RAPPORT_ROLLBACK);
    render(
      <ImportBudgetDialog
        isOpen
        onClose={vi.fn()}
        versionId="10"
        scenarioId="100"
      />,
    );
    fireEvent.change(screen.getByTestId('input-file'), {
      target: { files: [makeFile('budget.csv')] },
    });
    fireEvent.click(screen.getByTestId('checkbox-confirmation'));
    fireEvent.click(screen.getByTestId('btn-importer'));
    await waitFor(() =>
      expect(screen.getByTestId('rollback-alert')).toBeInTheDocument(),
    );
    expect(toastError).toHaveBeenCalled();
  });

  it('Erreur réseau → revient à l\'étape sélection avec message', async () => {
    mockImport.mockRejectedValue(buildAxiosError(500, 'Internal Server Error'));
    render(
      <ImportBudgetDialog
        isOpen
        onClose={vi.fn()}
        versionId="10"
        scenarioId="100"
      />,
    );
    fireEvent.change(screen.getByTestId('input-file'), {
      target: { files: [makeFile('budget.csv')] },
    });
    fireEvent.click(screen.getByTestId('checkbox-confirmation'));
    fireEvent.click(screen.getByTestId('btn-importer'));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toMatch(/Internal/),
    );
    // Toujours sur l'étape sélection
    expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
  });

  it('Format non supporté (.pdf) → toast erreur, pas de fichier sélectionné', () => {
    render(
      <ImportBudgetDialog
        isOpen
        onClose={vi.fn()}
        versionId="10"
        scenarioId="100"
      />,
    );
    fireEvent.change(screen.getByTestId('input-file'), {
      target: { files: [new File(['x'], 'document.pdf', { type: 'application/pdf' })] },
    });
    expect(toastError).toHaveBeenCalledWith(
      expect.stringMatching(/Format non supporté/),
    );
    expect(screen.queryByTestId('file-selected')).not.toBeInTheDocument();
  });

  it('Bouton Importer désactivé si versionId absent', () => {
    render(
      <ImportBudgetDialog
        isOpen
        onClose={vi.fn()}
        versionId={null}
        scenarioId={null}
      />,
    );
    fireEvent.change(screen.getByTestId('input-file'), {
      target: { files: [makeFile('budget.csv')] },
    });
    expect(screen.getByTestId('btn-importer')).toBeDisabled();
  });
});
