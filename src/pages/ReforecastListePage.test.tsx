/**
 * Tests Vitest ReforecastListePage (Lot 5.3.B).
 */
import {
  cleanup,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/reforecast', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/reforecast')>(
    '@/lib/api/reforecast',
  );
  return {
    ...actual,
    listerReforecasts: vi.fn(),
  };
});
vi.mock('@/lib/api/versions', () => ({
  listVersions: vi.fn().mockResolvedValue({ items: [] }),
}));
vi.mock('@/lib/api/scenarios', () => ({
  listScenarios: vi.fn().mockResolvedValue({ items: [] }),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
const mockHasPermission = vi.fn();
vi.mock('@/lib/auth/permissions', () => ({
  useHasPermission: (perm: string) => mockHasPermission(perm),
}));

import { type Reforecast, listerReforecasts } from '@/lib/api/reforecast';
import { useReforecastStore } from '@/lib/stores/reforecast-store';
import { ReforecastListePage } from './ReforecastListePage';

const mockLister = listerReforecasts as unknown as ReturnType<typeof vi.fn>;

function makeRf(over: Partial<Reforecast> = {}): Reforecast {
  return {
    id: '1',
    codeVersion: 'REFORECAST_T1_2027_1',
    libelle: 'Reforecast T1 2027',
    exerciceFiscal: 2027,
    statut: 'ouvert',
    statutPublication: 'ACTIVE',
    fkVersionSource: '10',
    fkScenarioSource: '20',
    trimestreConsolide: 1,
    anneeConsolide: 2027,
    methodeExtrapolation: 'BUDGET_INITIAL',
    dateObsolescence: null,
    fkVersionRemplacante: null,
    libelleVersionSource: 'Budget initial',
    libelleScenarioSource: 'Optimiste',
    dateCreation: '2027-04-01T00:00:00Z',
    utilisateurCreation: 'admin',
    commentaire: null,
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ReforecastListePage />
    </MemoryRouter>,
  );
}

describe('ReforecastListePage', () => {
  beforeEach(() => {
    useReforecastStore.setState({
      statutPublication: 'ACTIVE',
      statutWorkflow: 'TOUS',
      anneeConsolide: null,
      recherche: '',
      liste: [],
      loading: false,
      error: null,
    });
    mockLister.mockReset();
    mockHasPermission.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('affiche le titre et le sous-titre', async () => {
    mockLister.mockResolvedValue([]);
    mockHasPermission.mockReturnValue(false);
    renderPage();
    expect(screen.getByText(/Reforecasts trimestriels/i)).toBeInTheDocument();
    await waitFor(() => expect(mockLister).toHaveBeenCalled());
  });

  it("affiche bouton 'Lancer un reforecast' si BUDGET.REFORECAST_LANCER", async () => {
    mockLister.mockResolvedValue([]);
    mockHasPermission.mockImplementation(
      (p: string) => p === 'BUDGET.REFORECAST_LANCER',
    );
    renderPage();
    await waitFor(() => expect(mockLister).toHaveBeenCalled());
    expect(screen.getByTestId('rf-btn-lancer')).toBeInTheDocument();
  });

  it("masque le bouton 'Lancer' sans BUDGET.REFORECAST_LANCER", async () => {
    mockLister.mockResolvedValue([]);
    mockHasPermission.mockReturnValue(false);
    renderPage();
    await waitFor(() => expect(mockLister).toHaveBeenCalled());
    expect(screen.queryByTestId('rf-btn-lancer')).not.toBeInTheDocument();
  });

  it("affiche l'empty state si aucun reforecast", async () => {
    mockLister.mockResolvedValue([]);
    mockHasPermission.mockReturnValue(true);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('rf-liste-empty-global')).toBeInTheDocument(),
    );
  });

  it('affiche le tableau avec 3 reforecasts (1 ACTIVE Brouillon + 1 ACTIVE Publié + 1 OBSOLETE)', async () => {
    mockLister.mockResolvedValue([
      makeRf({ id: '1', libelle: 'A', statut: 'ouvert', statutPublication: 'ACTIVE' }),
      makeRf({ id: '2', libelle: 'B', statut: 'gele', statutPublication: 'ACTIVE' }),
      makeRf({ id: '3', libelle: 'C', statutPublication: 'OBSOLETE' }),
    ]);
    mockHasPermission.mockReturnValue(true);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('rf-liste-table')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('rf-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('rf-row-2')).toBeInTheDocument();
    expect(screen.getByTestId('rf-row-3')).toBeInTheDocument();
    expect(screen.getByTestId('badge-statut-pub-obsolete')).toBeInTheDocument();
  });

  it("affiche l'erreur dans un bandeau si fetch échoue", async () => {
    mockLister.mockRejectedValue(new Error('Boom'));
    mockHasPermission.mockReturnValue(true);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('rf-error-state')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('rf-error-state').textContent).toContain('Boom');
  });
});
