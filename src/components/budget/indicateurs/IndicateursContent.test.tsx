/**
 * Tests Vitest IndicateursContent (Lot 3.6).
 *
 * Couvrent :
 *  - Mount → fetch parallèle des 3 endpoints
 *  - Switch d'onglet (par-cr, comparaison)
 *  - Coloration coef selon seuil (sain/attention/alerte)
 *  - Bouton refresh : appel POST + refetch
 *  - Loading state
 *  - Erreur réseau gérée
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

vi.mock('@/lib/api/indicateurs', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/indicateurs')
  >('@/lib/api/indicateurs');
  return {
    ...actual,
    getIndicateursGlobaux: vi.fn(),
    getIndicateursParCr: vi.fn(),
    getIndicateursComparaison: vi.fn(),
    refreshIndicateurs: vi.fn(),
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
  getIndicateursComparaison,
  getIndicateursGlobaux,
  getIndicateursParCr,
  refreshIndicateurs,
  type IndicateursComparaison,
  type IndicateursGlobaux,
  type IndicateursParCr,
} from '@/lib/api/indicateurs';
import { IndicateursContent } from './IndicateursContent';

const mockG = getIndicateursGlobaux as unknown as ReturnType<typeof vi.fn>;
const mockC = getIndicateursParCr as unknown as ReturnType<typeof vi.fn>;
const mockComp = getIndicateursComparaison as unknown as ReturnType<typeof vi.fn>;
const mockRefresh = refreshIndicateurs as unknown as ReturnType<typeof vi.fn>;

const G_SAIN: IndicateursGlobaux = {
  pnb: 200,
  mni: 50,
  coefExploitation: 50, // < 70 → sain
  chargesHorsInterets: 100,
  totalProduits: 250,
  totalCharges: 150,
  nbCrInclus: 2,
  derniereMaj: '2026-05-01T10:00:00Z',
};

const C_LIST: IndicateursParCr[] = [
  {
    crId: '200',
    codeCr: 'BR_CIV',
    libelleCr: 'Branche CIV',
    pnb: 120,
    mni: 30,
    coefExploitation: 50,
    chargesHorsInterets: 60,
    totalProduits: 150,
  },
  {
    crId: '201',
    codeCr: 'BR_BFA',
    libelleCr: 'Branche BFA',
    pnb: 80,
    mni: 20,
    coefExploitation: 150, // > 100 → alerte
    chargesHorsInterets: 120,
    totalProduits: 100,
  },
];

const COMP: IndicateursComparaison = {
  version: { id: '10', codeVersion: 'BI_2027', libelle: 'Budget initial 2027' },
  exerciceFiscal: 2027,
  derniereMaj: '2026-05-01T10:00:00Z',
  scenarios: [
    {
      scenarioId: '100',
      codeScenario: 'MEDIAN_2027',
      libelle: 'Médian',
      typeScenario: 'central',
      pnb: 200,
      mni: 50,
      coefExploitation: 50,
      chargesHorsInterets: 100,
      totalProduits: 250,
      totalCharges: 150,
    },
    {
      scenarioId: '101',
      codeScenario: 'OPTIMISTE_2027',
      libelle: 'Optimiste',
      typeScenario: 'optimiste',
      pnb: 260,
      mni: 80,
      coefExploitation: 38.5,
      chargesHorsInterets: 100,
      totalProduits: 310,
      totalCharges: 150,
    },
  ],
};

function setupHappyMocks(): void {
  mockG.mockResolvedValue(G_SAIN);
  mockC.mockResolvedValue(C_LIST);
  mockComp.mockResolvedValue(COMP);
}

function buildAxiosError(status: number, message: string): AxiosError {
  return new AxiosError(message, String(status), undefined, undefined, {
    status,
    data: { statusCode: status, message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() } as never,
  });
}

describe('IndicateursContent', () => {
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('mount → appelle les 3 endpoints en parallèle', async () => {
    setupHappyMocks();
    render(
      <IndicateursContent
        versionId="10"
        scenarioId="100"
        exerciceFiscal={2027}
      />,
    );
    await waitFor(() => {
      expect(mockG).toHaveBeenCalledWith({
        versionId: '10',
        scenarioId: '100',
        exerciceFiscal: 2027,
      });
      expect(mockC).toHaveBeenCalledWith({
        versionId: '10',
        scenarioId: '100',
        exerciceFiscal: 2027,
      });
      expect(mockComp).toHaveBeenCalledWith({
        versionId: '10',
        exerciceFiscal: 2027,
      });
    });
  });

  it('Vue d\'ensemble : KPI PNB / MNI / Coef rendus', async () => {
    setupHappyMocks();
    render(
      <IndicateursContent
        versionId="10"
        scenarioId="100"
        exerciceFiscal={2027}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('onglet-global')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('kpi-PNB')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-MNI')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-coef')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-PNB').textContent).toMatch(/200/);
  });

  it('switch « Par CR » : 2 lignes triées par PNB DESC', async () => {
    setupHappyMocks();
    render(
      <IndicateursContent
        versionId="10"
        scenarioId="100"
        exerciceFiscal={2027}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('onglet-global')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('tab-par-cr'));
    await waitFor(() =>
      expect(screen.getByTestId('onglet-par-cr')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('par-cr-row-BR_CIV')).toBeInTheDocument();
    expect(screen.getByTestId('par-cr-row-BR_BFA')).toBeInTheDocument();
  });

  it('Coef > 100% en rouge (font-semibold + classe red)', async () => {
    setupHappyMocks();
    render(
      <IndicateursContent
        versionId="10"
        scenarioId="100"
        exerciceFiscal={2027}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('onglet-global')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('tab-par-cr'));
    await waitFor(() =>
      expect(screen.getByTestId('coef-BR_BFA')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('coef-BR_BFA').className).toMatch(/red/);
  });

  it('Onglet Comparaison : 2 colonnes scénarios', async () => {
    setupHappyMocks();
    render(
      <IndicateursContent
        versionId="10"
        scenarioId="100"
        exerciceFiscal={2027}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('onglet-global')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('tab-comparaison'));
    await waitFor(() =>
      expect(screen.getByTestId('onglet-comparaison')).toBeInTheDocument(),
    );
    expect(
      screen.getByTestId('col-scenario-MEDIAN_2027'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('col-scenario-OPTIMISTE_2027'),
    ).toBeInTheDocument();
  });

  it('Bouton « Recalculer » : appelle POST refresh + refetch', async () => {
    setupHappyMocks();
    mockRefresh.mockResolvedValue({ dureeMs: 42, nbLignes: 7 });
    render(
      <IndicateursContent
        versionId="10"
        scenarioId="100"
        exerciceFiscal={2027}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('onglet-global')).toBeInTheDocument(),
    );
    mockG.mockClear();
    fireEvent.click(screen.getByTestId('btn-refresh-indicateurs'));
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockG).toHaveBeenCalledTimes(1); // refetch
    });
    expect(toastSuccess).toHaveBeenCalledWith(
      expect.stringMatching(/42 ms.*7 ligne/),
    );
  });

  it('Erreur réseau au mount → bandeau d\'erreur affiché', async () => {
    mockG.mockRejectedValue(buildAxiosError(500, 'Internal Server Error'));
    mockC.mockRejectedValue(buildAxiosError(500, 'Internal Server Error'));
    mockComp.mockRejectedValue(buildAxiosError(500, 'Internal Server Error'));
    render(
      <IndicateursContent
        versionId="10"
        scenarioId="100"
        exerciceFiscal={2027}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument(),
    );
    expect(screen.getByRole('alert').textContent).toMatch(/Internal/);
  });

  it('Coefficient null → cellule « — » et style "n/a"', async () => {
    mockG.mockResolvedValue({ ...G_SAIN, coefExploitation: null });
    mockC.mockResolvedValue([]);
    mockComp.mockResolvedValue({ ...COMP, scenarios: [] });
    render(
      <IndicateursContent
        versionId="10"
        scenarioId="100"
        exerciceFiscal={2027}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('kpi-coef')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('kpi-coef').textContent).toMatch(/—/);
  });

  it('Liste « Par CR » vide → empty state', async () => {
    mockG.mockResolvedValue(G_SAIN);
    mockC.mockResolvedValue([]);
    mockComp.mockResolvedValue(COMP);
    render(
      <IndicateursContent
        versionId="10"
        scenarioId="100"
        exerciceFiscal={2027}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('onglet-global')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('tab-par-cr'));
    await waitFor(() =>
      expect(screen.getByTestId('par-cr-empty')).toBeInTheDocument(),
    );
  });

  it('Comparaison sans scénario → empty state', async () => {
    mockG.mockResolvedValue(G_SAIN);
    mockC.mockResolvedValue(C_LIST);
    mockComp.mockResolvedValue({ ...COMP, scenarios: [] });
    render(
      <IndicateursContent
        versionId="10"
        scenarioId="100"
        exerciceFiscal={2027}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('onglet-global')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('tab-comparaison'));
    await waitFor(() =>
      expect(screen.getByTestId('comparaison-empty')).toBeInTheDocument(),
    );
  });
});
