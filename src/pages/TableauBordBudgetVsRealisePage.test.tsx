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
    exporterEcartsPdf: vi.fn(),
  };
});
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Hotfix IA-0 — gate du bouton MIZNAS AI par AI.ANALYSER. Défaut `true`
// pour préserver le comportement des tests existants (qui voient les
// contrôles IA) ; les 2 cas dédiés basculent la valeur.
const mockCanUseAi = vi.fn(() => true);
vi.mock('@/lib/auth/permissions', () => ({
  useHasPermission: () => mockCanUseAi(),
}));

import {
  analyserEcarts,
  exporterEcartsPdf,
  type EcartsResponse,
} from '@/lib/api/tableau-bord';
import { useTableauBordStore } from '@/lib/stores/tableau-bord-store';
import { TableauBordBudgetVsRealisePage } from './TableauBordBudgetVsRealisePage';

const mockAnalyser = analyserEcarts as unknown as ReturnType<typeof vi.fn>;
const mockExportPdf = exporterEcartsPdf as unknown as ReturnType<typeof vi.fn>;

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
      nbSansBudget: 0,
      ecartTotalAbs: 1_500_000,
      ecartTotalDefavorable: 1_000_000,
      ecartTotalFavorable: 500_000,
    },
    totaux: {
      produits: {
        budget: 800_000,
        realise: 750_000,
        ecart: -50_000,
        tauxExecution: 93.8,
      },
      charges: {
        budget: 1_200_000,
        realise: 1_200_000,
        ecart: 0,
        tauxExecution: 100,
      },
      solde: {
        budget: -400_000,
        realise: -450_000,
        ecart: -50_000,
        tauxExecution: 112.5,
      },
      pnb: {
        budget: 800_000,
        realise: 750_000,
        ecart: -50_000,
        tauxExecution: 93.8,
      },
      coefExploitationBudget: 150,
      coefExploitationRealise: 160,
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
        tauxExecution: 120,
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
        tauxExecution: 93.8,
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
        tauxExecution: null,
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
      filtreClasse: 'TOUTES',
      rechercheTexte: '',
      drillCr: null,
      drillLm: null,
    });
    mockAnalyser.mockReset();
    mockCanUseAi.mockReturnValue(true);
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

  // ─── Lot 8.6.B — export PDF (dropdown)

  it('export PDF : appelle exporterEcartsPdf sans snapshot IA', async () => {
    mockAnalyser.mockResolvedValue(makeResponse());
    mockExportPdf.mockResolvedValue(undefined);
    render(<TableauBordBudgetVsRealisePage />);
    await waitFor(() =>
      expect(screen.getByTestId('ecarts-table')).toBeInTheDocument(),
    );
    const trigger = screen.getByTestId('btn-exporter');
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.click(await screen.findByTestId('export-pdf'));

    await waitFor(() => expect(mockExportPdf).toHaveBeenCalledTimes(1));
    expect(mockExportPdf.mock.calls[0][0]).toMatchObject({
      versionId: 'v1',
      scenarioId: 's1',
    });
    // Sans analyse IA à l'écran → pas de snapshot (2e argument undefined).
    expect(mockExportPdf.mock.calls[0][1]).toBeUndefined();
  });

  it('item « PDF avec analyse IA » désactivé tant qu’aucune analyse IA', async () => {
    mockAnalyser.mockResolvedValue(makeResponse());
    render(<TableauBordBudgetVsRealisePage />);
    await waitFor(() =>
      expect(screen.getByTestId('ecarts-table')).toBeInTheDocument(),
    );
    const trigger = screen.getByTestId('btn-exporter');
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    const item = await screen.findByTestId('export-pdf-ia');
    // Radix pose `data-disabled` sur un DropdownMenuItem désactivé.
    expect(item).toHaveAttribute('data-disabled');
  });

  // ─── Hotfix IA-0 — gate bouton MIZNAS AI par AI.ANALYSER ──────

  it('SAISISSEUR (sans AI.ANALYSER) : le bouton MIZNAS AI est masqué', async () => {
    mockCanUseAi.mockReturnValue(false);
    render(<TableauBordBudgetVsRealisePage />);
    await waitFor(() =>
      expect(screen.getByTestId('filtres-form')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('btn-analyser-ai')).not.toBeInTheDocument();
  });

  it('PUBLICATEUR (avec AI.ANALYSER) : le bouton MIZNAS AI est affiché', async () => {
    mockCanUseAi.mockReturnValue(true);
    render(<TableauBordBudgetVsRealisePage />);
    await waitFor(() =>
      expect(screen.getByTestId('btn-analyser-ai')).toBeInTheDocument(),
    );
  });

  // ─── PR1 — compte de résultat ────────────────────────────────

  it('KPI compte de résultat : PNB Budget / Réalisé, CE et Sans budget', async () => {
    mockAnalyser.mockResolvedValue(makeResponse());
    render(<TableauBordBudgetVsRealisePage />);
    await waitFor(() =>
      expect(screen.getByTestId('kpi-cards')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('kpi-pnb-budget').textContent).toContain('800');
    expect(screen.getByTestId('kpi-pnb-realise').textContent).toContain('750');
    expect(screen.getByTestId('kpi-ce-budget').textContent).toContain('150');
    expect(screen.getByTestId('kpi-sans-budget').textContent).toBe('0');
  });

  it('filtre par classe PRODUITS : ne garde que la classe 7', async () => {
    mockAnalyser.mockResolvedValue(makeResponse());
    render(<TableauBordBudgetVsRealisePage />);
    await waitFor(() =>
      expect(screen.getByTestId('ecarts-table')).toBeInTheDocument(),
    );
    useTableauBordStore.setState({ filtreClasse: 'PRODUITS' });
    await waitFor(() =>
      expect(screen.getByTestId('compteur-affichees').textContent).toBe('1'),
    );
  });

  it('affiche les sous-totaux Produits/Charges + Solde', async () => {
    mockAnalyser.mockResolvedValue(makeResponse());
    render(<TableauBordBudgetVsRealisePage />);
    await waitFor(() =>
      expect(screen.getByTestId('ecarts-table')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('sous-total-produits')).toBeInTheDocument();
    expect(screen.getByTestId('sous-total-charges')).toBeInTheDocument();
    expect(screen.getByTestId('solde')).toBeInTheDocument();
  });

  it('colonne % d’exécution présente dans le tableau', async () => {
    mockAnalyser.mockResolvedValue(makeResponse());
    render(<TableauBordBudgetVsRealisePage />);
    await waitFor(() =>
      expect(screen.getByTestId('ecarts-table')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('th-tauxExecution')).toBeInTheDocument();
  });

  // ─── PR2 — visualisations + drill-down ───────────────────────

  it('affiche la section Visualisations par dimension (CR + LM)', async () => {
    mockAnalyser.mockResolvedValue(makeResponse());
    render(<TableauBordBudgetVsRealisePage />);
    await waitFor(() =>
      expect(screen.getByTestId('ecarts-table')).toBeInTheDocument(),
    );
    expect(
      screen.getByTestId('visualisations-dimension'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('graph-barres-cr')).toBeInTheDocument();
    expect(screen.getByTestId('graph-barres-lm')).toBeInTheDocument();
  });

  it('drill-down CR : filtre le tableau + chip + clear', async () => {
    mockAnalyser.mockResolvedValue(makeResponse());
    render(<TableauBordBudgetVsRealisePage />);
    await waitFor(() =>
      expect(screen.getByTestId('ecarts-table')).toBeInTheDocument(),
    );
    // Simule un clic sur la barre CR_BANDABARI (2 lignes : 6111, 6112).
    useTableauBordStore.setState({ drillCr: 'CR_BANDABARI' });
    await waitFor(() =>
      expect(screen.getByTestId('compteur-affichees').textContent).toBe('2'),
    );
    expect(screen.getByTestId('drill-indicateur').textContent).toContain(
      'CR_BANDABARI',
    );
    // Clear → retour aux 3 lignes.
    fireEvent.click(screen.getByTestId('drill-clear'));
    await waitFor(() =>
      expect(screen.getByTestId('compteur-affichees').textContent).toBe('3'),
    );
    expect(screen.queryByTestId('drill-indicateur')).not.toBeInTheDocument();
  });
});
