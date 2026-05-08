/**
 * Tests Vitest ReforecastDetailPage (Lot 5.3.B).
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/reforecast', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/reforecast')>(
    '@/lib/api/reforecast',
  );
  return {
    ...actual,
    getReforecast: vi.fn(),
    getReforecastComparaison: vi.fn().mockResolvedValue({
      lignes: [],
      totalSource: 0,
      totalReforecast: 0,
      totalEcart: 0,
    }),
  };
});
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
const mockHasPermission = vi.fn();
vi.mock('@/lib/auth/permissions', () => ({
  useHasPermission: (perm: string) => mockHasPermission(perm),
}));

import { type Reforecast, getReforecast } from '@/lib/api/reforecast';
import { ReforecastDetailPage } from './ReforecastDetailPage';

const mockGet = getReforecast as unknown as ReturnType<typeof vi.fn>;

function makeRf(over: Partial<Reforecast> = {}): Reforecast {
  return {
    id: '42',
    codeVersion: 'REFORECAST_T1_2027_42',
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

function renderPage(id = '42') {
  return render(
    <MemoryRouter initialEntries={[`/reforecast/${id}`]}>
      <Routes>
        <Route path="/reforecast/:id" element={<ReforecastDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ReforecastDetailPage', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockHasPermission.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('charge le reforecast et affiche header + onglets', async () => {
    mockGet.mockResolvedValue(makeRf());
    mockHasPermission.mockReturnValue(true);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('rf-detail-page')).toBeInTheDocument(),
    );
    expect(screen.getByText('Reforecast T1 2027')).toBeInTheDocument();
    expect(screen.getByTestId('tab-grille')).toBeInTheDocument();
    expect(screen.getByTestId('tab-comparaison')).toBeInTheDocument();
  });

  it("affiche les boutons workflow conditionnellement (Brouillon + BUDGET.SOUMETTRE → bouton Soumettre)", async () => {
    mockGet.mockResolvedValue(makeRf({ statut: 'ouvert' }));
    mockHasPermission.mockImplementation((p: string) => p === 'BUDGET.SOUMETTRE');
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('rf-btn-soumettre')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('rf-btn-valider')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rf-btn-publier')).not.toBeInTheDocument();
  });

  it("Valider visible si statut=Soumis + BUDGET.VALIDER", async () => {
    mockGet.mockResolvedValue(makeRf({ statut: 'soumis' }));
    mockHasPermission.mockImplementation((p: string) => p === 'BUDGET.VALIDER');
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('rf-btn-valider')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('rf-btn-rejeter')).toBeInTheDocument();
  });

  it("affiche banner OBSOLETE et masque les boutons workflow", async () => {
    mockGet
      .mockResolvedValueOnce(
        makeRf({
          statutPublication: 'OBSOLETE',
          fkVersionRemplacante: '99',
          dateObsolescence: '2027-04-15T00:00:00Z',
        }),
      )
      .mockResolvedValueOnce(
        makeRf({ id: '99', codeVersion: 'NEW_CODE', libelle: 'Reforecast remplaçant' }),
      );
    mockHasPermission.mockReturnValue(true);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('rf-banner-obsolete')).toBeInTheDocument(),
    );
    // Plus de boutons workflow (statut_publication=OBSOLETE)
    expect(screen.queryByTestId('rf-btn-soumettre')).not.toBeInTheDocument();
    // Lien remplaçant cliquable
    const lien = screen.getByTestId('rf-link-remplacant') as HTMLAnchorElement;
    expect(lien.getAttribute('href')).toBe('/reforecast/99');
    expect(lien.textContent).toContain('Reforecast remplaçant');
  });

  it("clic sur l'onglet Comparaison change le contenu affiché", async () => {
    mockGet.mockResolvedValue(makeRf());
    mockHasPermission.mockReturnValue(true);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('tab-comparaison')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('tab-comparaison'));
    await waitFor(() =>
      expect(
        screen.getByTestId('tabpanel-comparaison'),
      ).toBeInTheDocument(),
    );
  });

  it("affiche un message d'erreur si fetch échoue", async () => {
    mockGet.mockRejectedValue(new Error('404'));
    mockHasPermission.mockReturnValue(true);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('rf-detail-error')).toBeInTheDocument(),
    );
  });
});
