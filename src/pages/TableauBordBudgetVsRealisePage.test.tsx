/**
 * Tests Vitest TableauBordBudgetVsRealisePage (Lot 5.2.C).
 * Vérifient l'assemblage filtres + KPI + tableau, le filtre
 * rapide, la recherche et l'état d'erreur.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/referentiels', () => ({
  listVersions: vi.fn().mockResolvedValue({
    items: [
      { id: 'v1', codeVersion: 'BUDGET_2026', statut: 'gele' },
    ],
    total: 1,
    page: 1,
    limit: 200,
  }),
  listScenarios: vi.fn().mockResolvedValue({
    items: [{ id: 's1', codeScenario: 'CENTRAL' }],
    total: 1,
    page: 1,
    limit: 200,
  }),
  listCrs: vi.fn().mockResolvedValue({
    items: [{ id: 'cr1', codeCr: 'CR_BANDABARI', libelle: 'Bandabari' }],
    total: 1,
    page: 1,
    limit: 200,
  }),
}));
vi.mock('@/lib/api/tableau-bord', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/tableau-bord')>(
    '@/lib/api/tableau-bord',
  );
  return {
    ...actual,
    analyserEcarts: vi.fn(),
    exporterEcartsExcel: vi.fn(),
  };
});
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { analyserEcarts, type EcartsResponse } from '@/lib/api/tableau-bord';
import { useTableauBordStore } from '@/lib/stores/tableau-bord-store';
import { TableauBordBudgetVsRealisePage } from './TableauBordBudgetVsRealisePage';

const mockAnalyser = analyserEcarts as unknown as ReturnType<typeof vi.fn>;

function makeResponse(): EcartsResponse {
  return {
    filtres: {
      versionId: 'v1',
      scenarioId: 's1',
      moisDebut: '2026-01',
      moisFin: '2026-03',
    },
    kpi: {
      nbEcartsTotal: 3,
      nbEcartsCritique: 1,
      nbEcartsAttention: 1,
      nbLignesManquantes: 1,
      ecartTotalAbs: 1_500_000,
      ecartTotalDefavorable: 1_000_000,
      ecartTotalFavorable: 500_000,
    },
    lignes: [
      {
        codeCr: 'CR_BANDABARI',
        libelleCr: 'Bandabari',
        codeCompte: '6111',
        libelleCompte: 'Charges',
        classeCompte: '6',
        natureCompte: 'CHARGE',
        codeLigneMetier: 'EXPLOITATION',
        mois: '2026-03',
        libelleMois: 'mars 2026',
        montantBudget: 1_000_000,
        montantRealise: 1_200_000,
        ecart: 200_000,
        ecartAbs: 200_000,
        ecartPct: 20,
        niveauAlerte: 'CRITIQUE',
        sensEcart: 'DEFAVORABLE',
      },
      {
        codeCr: 'CR_DOSSO',
        libelleCr: 'Dosso',
        codeCompte: '7011',
        libelleCompte: 'Produit',
        classeCompte: '7',
        natureCompte: 'PRODUIT',
        codeLigneMetier: 'COLLECTE',
        mois: '2026-03',
        libelleMois: 'mars 2026',
        montantBudget: 800_000,
        montantRealise: 750_000,
        ecart: -50_000,
        ecartAbs: 50_000,
        ecartPct: -6.25,
        niveauAlerte: 'ATTENTION',
        sensEcart: 'DEFAVORABLE',
      },
      {
        codeCr: 'CR_BANDABARI',
        libelleCr: 'Bandabari',
        codeCompte: '6112',
        libelleCompte: 'Autres charges',
        classeCompte: '6',
        natureCompte: 'CHARGE',
        codeLigneMetier: 'EXPLOITATION',
        mois: '2026-03',
        libelleMois: 'mars 2026',
        montantBudget: 200_000,
        montantRealise: null,
        ecart: null,
        ecartAbs: null,
        ecartPct: null,
        niveauAlerte: 'MANQUANT',
        sensEcart: null,
      },
    ],
  };
}

describe('TableauBordBudgetVsRealisePage', () => {
  beforeEach(() => {
    // Reset complet du store
    useTableauBordStore.setState({
      versionId: 'v1',
      scenarioId: 's1',
      crIds: [],
      moisDebut: '2026-01',
      moisFin: '2026-03',
      seuilEcartPctAttention: 5,
      seuilEcartPctCritique: 10,
      ecarts: null,
      loading: false,
      error: null,
      filtreRapide: 'TOUS',
      rechercheTexte: '',
    });
    mockAnalyser.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('affiche le titre et les filtres au mount', () => {
    render(<TableauBordBudgetVsRealisePage />);
    expect(
      screen.getByText(/Tableau de bord — Budget vs Réalisé/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId('filtres-form')).toBeInTheDocument();
  });

  it('charge automatiquement les écarts si version et scénario sont déjà sélectionnés', async () => {
    mockAnalyser.mockResolvedValue(makeResponse());
    render(<TableauBordBudgetVsRealisePage />);
    await waitFor(() => expect(mockAnalyser).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByTestId('kpi-cards')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('kpi-total').textContent).toBe('3');
    expect(screen.getByTestId('kpi-critique').textContent).toBe('1');
  });

  it('rend le tableau des écarts après chargement et expose le compteur', async () => {
    mockAnalyser.mockResolvedValue(makeResponse());
    render(<TableauBordBudgetVsRealisePage />);
    await waitFor(() =>
      expect(screen.getByTestId('ecarts-table')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('compteur-affichees').textContent).toBe('3');
    expect(screen.getByTestId('compteur-total').textContent).toBe('3');
  });

  it('filtre rapide CRITIQUE : ne garde que les lignes critiques', async () => {
    mockAnalyser.mockResolvedValue(makeResponse());
    render(<TableauBordBudgetVsRealisePage />);
    await waitFor(() =>
      expect(screen.getByTestId('ecarts-table')).toBeInTheDocument(),
    );
    // Modifie filtre rapide via le store (l'API <Select> Radix
    // est complexe à manipuler en jsdom).
    useTableauBordStore.setState({ filtreRapide: 'CRITIQUE' });
    await waitFor(() =>
      expect(screen.getByTestId('compteur-affichees').textContent).toBe('1'),
    );
  });

  it('recherche texte filtre par codeCompte', async () => {
    mockAnalyser.mockResolvedValue(makeResponse());
    render(<TableauBordBudgetVsRealisePage />);
    await waitFor(() =>
      expect(screen.getByTestId('ecarts-table')).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByTestId('recherche-texte'), {
      target: { value: '7011' },
    });
    await waitFor(() =>
      expect(screen.getByTestId('compteur-affichees').textContent).toBe('1'),
    );
  });

  it("affiche l'état d'erreur si analyser échoue", async () => {
    mockAnalyser.mockRejectedValueOnce(
      new Error('Périmètre vide pour cet utilisateur.'),
    );
    render(<TableauBordBudgetVsRealisePage />);
    await waitFor(() =>
      expect(screen.getByTestId('error-state')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('error-state').textContent).toContain(
      'Périmètre vide',
    );
  });

  it('respecte le filtre rapide combiné avec recherche : intersection vide', async () => {
    mockAnalyser.mockResolvedValue(makeResponse());
    render(<TableauBordBudgetVsRealisePage />);
    await waitFor(() =>
      expect(screen.getByTestId('ecarts-table')).toBeInTheDocument(),
    );
    useTableauBordStore.setState({ filtreRapide: 'MANQUANT' });
    fireEvent.change(screen.getByTestId('recherche-texte'), {
      target: { value: '7011' },
    });
    await waitFor(() =>
      expect(screen.getByTestId('compteur-affichees').textContent).toBe('0'),
    );
    // Empty state du tableau
    expect(screen.getByTestId('empty-ecarts')).toBeInTheDocument();
  });
});
