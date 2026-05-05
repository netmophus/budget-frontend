/**
 * Tests Vitest TableauDeBordPage (Lot 3.6).
 */
import {
  cleanup,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/versions', () => ({
  listVersions: vi.fn(),
}));
vi.mock('@/lib/api/scenarios', () => ({
  listScenarios: vi.fn(),
}));
vi.mock('@/components/budget/indicateurs/IndicateursContent', () => ({
  IndicateursContent: ({
    versionId,
    scenarioId,
    exerciceFiscal,
  }: {
    versionId: string;
    scenarioId: string;
    exerciceFiscal: number;
  }) => (
    <div
      data-testid="indicateurs-content-stub"
      data-version={versionId}
      data-scenario={scenarioId}
      data-exercice={exerciceFiscal}
    >
      stub
    </div>
  ),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { listScenarios } from '@/lib/api/scenarios';
import { listVersions, type Version } from '@/lib/api/versions';
import { TableauDeBordPage } from './TableauDeBordPage';

const mockVersions = listVersions as unknown as ReturnType<typeof vi.fn>;
const mockScenarios = listScenarios as unknown as ReturnType<typeof vi.fn>;

const VERSION_2027: Version = {
  id: '10',
  codeVersion: 'BI_2027',
  libelle: 'Budget initial 2027',
  typeVersion: 'budget_initial',
  exerciceFiscal: 2027,
  statut: 'ouvert',
  dateGel: null,
  utilisateurGel: null,
  commentaire: null,
  dateCreation: '2026-01-01T00:00:00Z',
  utilisateurCreation: 'system',
  dateModification: null,
  utilisateurModification: null,
  commentaireSoumission: null,
  commentaireValidation: null,
  commentaireRejet: null,
  commentairePublication: null,
  dateSoumission: null,
  utilisateurSoumission: null,
  dateValidation: null,
  utilisateurValidation: null,
  dateRejet: null,
  utilisateurRejet: null,
};

describe('TableauDeBordPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('charge versions + scénarios au mount', async () => {
    mockVersions.mockResolvedValue({
      items: [VERSION_2027],
      total: 1,
      page: 1,
      limit: 100,
    });
    mockScenarios.mockResolvedValue({
      items: [
        {
          id: '100',
          codeScenario: 'MEDIAN_2027',
          libelle: 'Médian',
          typeScenario: 'central',
          statut: 'actif',
          exerciceFiscal: 2027,
          dateCreation: '2026-01-01T00:00:00Z',
          utilisateurCreation: 'system',
          dateModification: null,
          utilisateurModification: null,
          commentaire: null,
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
    });
    render(<TableauDeBordPage />);
    await waitFor(() => {
      expect(mockVersions).toHaveBeenCalled();
      expect(mockScenarios).toHaveBeenCalled();
    });
  });

  it('présélectionne le scénario MEDIAN après chargement', async () => {
    mockVersions.mockResolvedValue({
      items: [VERSION_2027],
      total: 1,
      page: 1,
      limit: 100,
    });
    mockScenarios.mockResolvedValue({
      items: [
        {
          id: '99',
          codeScenario: 'OPTIMISTE_2027',
          libelle: 'Optimiste',
          typeScenario: 'optimiste',
          statut: 'actif',
          exerciceFiscal: 2027,
          dateCreation: '2026-01-01T00:00:00Z',
          utilisateurCreation: 'system',
          dateModification: null,
          utilisateurModification: null,
          commentaire: null,
        },
        {
          id: '100',
          codeScenario: 'MEDIAN_2027',
          libelle: 'Médian',
          typeScenario: 'central',
          statut: 'actif',
          exerciceFiscal: 2027,
          dateCreation: '2026-01-01T00:00:00Z',
          utilisateurCreation: 'system',
          dateModification: null,
          utilisateurModification: null,
          commentaire: null,
        },
      ],
      total: 2,
      page: 1,
      limit: 100,
    });
    render(<TableauDeBordPage />);
    await waitFor(() =>
      expect(
        screen.getByTestId('indicateurs-content-stub'),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByTestId('indicateurs-content-stub').dataset['scenario'],
    ).toBe('100'); // MEDIAN
    expect(
      screen.getByTestId('indicateurs-content-stub').dataset['exercice'],
    ).toBe('2027');
  });

  it("aucune version → message 'Sélectionnez …'", async () => {
    mockVersions.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 100,
    });
    mockScenarios.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 100,
    });
    render(<TableauDeBordPage />);
    await waitFor(() =>
      expect(screen.getByTestId('tdb-pas-de-contexte')).toBeInTheDocument(),
    );
  });
});
