/**
 * Tests SaisieBudgetHybridePage (Lot saisie hybride).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// SelecteurContexte fait des fetch référentiels : on le neutralise.
vi.mock('@/components/budget/grille/SelecteurContexte', () => ({
  SelecteurContexte: () => null,
}));

// CompteCombobox → stub : un bouton sélectionne le compte 601100.
vi.mock('@/components/budget/CompteCombobox', () => ({
  CompteCombobox: ({
    onChange,
    onSelectCompte,
  }: {
    onChange: (c: string) => void;
    onSelectCompte?: (c: {
      id: string;
      codeCompte: string;
      libelle: string;
      estCompteCollectif: boolean;
    }) => void;
  }) => (
    <button
      type="button"
      data-testid="mock-compte-select"
      onClick={() => {
        onChange('601100');
        onSelectCompte?.({
          id: 'cpt-601100',
          codeCompte: '601100',
          libelle: 'Achats',
          estCompteCollectif: false,
        });
      }}
    >
      select compte
    </button>
  ),
}));

vi.mock('@/lib/api/budget-grille', () => ({
  getGrilleSaisie: vi.fn(),
  saveGrilleSaisie: vi.fn(),
}));
vi.mock('@/lib/api/versions', () => ({
  getVersionById: vi
    .fn()
    .mockResolvedValue({ id: 'v1', exerciceFiscal: 2027, statut: 'ouvert' }),
}));
vi.mock('@/lib/auth/permissions', () => ({
  useHasPermission: vi.fn(() => true),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { getGrilleSaisie, saveGrilleSaisie } from '@/lib/api/budget-grille';
import { useBudgetGrilleStore } from '@/lib/stores/budget-grille-store';
import { SaisieBudgetHybridePage } from './SaisieBudgetHybridePage';

const mockGet = getGrilleSaisie as unknown as ReturnType<typeof vi.fn>;
const mockSave = saveGrilleSaisie as unknown as ReturnType<typeof vi.fn>;

const MOIS = Array.from(
  { length: 12 },
  (_, i) => `2027-${String(i + 1).padStart(2, '0')}-01`,
);

function grilleFixture() {
  return {
    version: { id: 'v1', codeVersion: 'BUDGET_2027', libelle: '', statut: 'ouvert' },
    scenario: { id: 's1', codeScenario: 'CENTRAL', libelle: '', typeScenario: 'central' },
    cr: { id: 'cr1', codeCr: 'CR_SIEGE', libelle: 'Siège', structureRattachee: null },
    exerciceFiscal: 2027,
    moisLabels: MOIS.map((_, i) => `M${i + 1} 2027`),
    comptesFeuillesEligibles: [],
    lignes: [
      {
        compte: {
          id: 'cpt-601100',
          codeCompte: '601100',
          libelle: 'Achats',
          classe: '6',
          sens: 'D',
          estPorteurInterets: false,
        },
        ligneMetier: { id: 'lm1', codeLigneMetier: 'RETAIL', libelle: 'Retail' },
        cellules: MOIS.map((m) => ({
          mois: m,
          montant: 0,
          modeSaisie: null,
          encoursMoyen: null,
          tie: null,
          commentaire: null,
          ligneId: null,
        })),
        totalAnnee: 0,
      },
    ],
    totauxMensuels: MOIS.map((m) => ({ mois: m, total: 0 })),
    totalAnneeCr: 0,
  };
}

describe('SaisieBudgetHybridePage', () => {
  beforeEach(() => {
    useBudgetGrilleStore.setState({
      versionId: 'v1',
      scenarioId: 's1',
      crId: 'cr1',
      ligneMetierId: 'lm1',
      codeClasse: '6',
    });
    mockGet.mockResolvedValue(grilleFixture());
    mockSave.mockResolvedValue({
      totalCellules: 12,
      inserees: 12,
      modifiees: 0,
      supprimees: 0,
      ignorees: 0,
      erreurs: [],
      dureeMs: 5,
    });
    localStorage.clear();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('affiche le message vide tant qu’aucun compte sélectionné', async () => {
    render(<SaisieBudgetHybridePage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.getByTestId('hybride-vide')).toBeInTheDocument();
  });

  it('mode annuel : répartit /12 et enregistre 12 cellules identiques', async () => {
    render(<SaisieBudgetHybridePage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    // Sélection du compte via le stub combobox.
    fireEvent.click(screen.getByTestId('mock-compte-select'));
    await waitFor(() =>
      expect(screen.getByTestId('hybride-form')).toBeInTheDocument(),
    );

    // Saisie annuelle 1 200 000 → 100 000 / mois.
    fireEvent.change(screen.getByTestId('hybride-montant-annuel'), {
      target: { value: '1200000' },
    });
    expect(screen.getByTestId('hybride-mois-ro-0').textContent).toContain(
      '100',
    );

    fireEvent.click(screen.getByTestId('hybride-enregistrer'));

    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    const req = mockSave.mock.calls[0][0];
    expect(req.lignes).toHaveLength(1);
    expect(req.lignes[0].compteId).toBe('cpt-601100');
    expect(req.lignes[0].cellules).toHaveLength(12);
    expect(req.lignes[0].cellules.every((c: { montant: number }) => c.montant === 100000)).toBe(true);
  });

  it('justification répliquée sur les 12 cellules', async () => {
    render(<SaisieBudgetHybridePage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('mock-compte-select'));
    await waitFor(() =>
      expect(screen.getByTestId('hybride-form')).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByTestId('hybride-justif'), {
      target: { value: 'Base 2026 + 5%' },
    });
    fireEvent.click(screen.getByTestId('hybride-enregistrer'));
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    const cellules = mockSave.mock.calls[0][0].lignes[0].cellules;
    expect(
      cellules.every((c: { commentaire: string }) => c.commentaire === 'Base 2026 + 5%'),
    ).toBe(true);
  });
});
