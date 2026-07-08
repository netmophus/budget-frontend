import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/analyseIa', () => ({
  listerAnalysesIa: vi.fn(),
  getAnalyseIaDetail: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import {
  getAnalyseIaDetail,
  listerAnalysesIa,
  type AnalyseIaDetail,
} from '@/lib/api/analyseIa';
import { ComparaisonAnalysesIaPage } from './ComparaisonAnalysesIaPage';

const mockDetail = getAnalyseIaDetail as unknown as ReturnType<typeof vi.fn>;
const mockLister = listerAnalysesIa as unknown as ReturnType<typeof vi.fn>;

function detail(over: Partial<AnalyseIaDetail>): AnalyseIaDetail {
  return {
    id: 'x',
    dateGeneration: '2027-02-01T10:00:00.000Z',
    demandeurEmail: 'a@x',
    versionId: '10',
    scenarioId: '20',
    moisDebut: '2027-01',
    moisFin: '2027-01',
    modele: 'claude-sonnet-4-6',
    tokensIn: 1,
    tokensOut: 1,
    dureeMs: 1,
    coutEstime: 0.001,
    dryRun: false,
    resume: 'r',
    crsSelectionnes: null,
    promptVersion: 'chantier-a-v1',
    reponseMarkdown: 'md',
    kpiSnapshot: { nbEcartsCritique: 5, nbEcartsAttention: 2 },
    hasDataset: true,
    ...over,
  };
}

function renderAt(query: string) {
  return render(
    <MemoryRouter initialEntries={[`/comparaison${query}`]}>
      <ComparaisonAnalysesIaPage />
    </MemoryRouter>,
  );
}

describe('ComparaisonAnalysesIaPage (Chantier C3)', () => {
  beforeEach(() => {
    mockLister.mockResolvedValue({ items: [], total: 0, page: 1, limit: 100 });
  });
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('sélection via URL (a,b) : affiche les 2 markdown côte à côte', async () => {
    mockDetail.mockImplementation((id: string) =>
      Promise.resolve(
        detail({ id, reponseMarkdown: id === '1' ? 'ANALYSE_A' : 'ANALYSE_B' }),
      ),
    );
    renderAt('?a=1&b=2');
    await waitFor(() =>
      expect(screen.getByTestId('markdown-Analyse A')).toHaveTextContent(
        'ANALYSE_A',
      ),
    );
    expect(screen.getByTestId('markdown-Analyse B')).toHaveTextContent(
      'ANALYSE_B',
    );
  });

  it('KPIs : évolution + coloration amélioration (vert) / dégradation (rouge)', async () => {
    mockDetail.mockImplementation((id: string) =>
      Promise.resolve(
        detail({
          id,
          kpiSnapshot:
            id === '1'
              ? { nbEcartsCritique: 5, nbEcartsAttention: 2 }
              : { nbEcartsCritique: 2, nbEcartsAttention: 4 },
        }),
      ),
    );
    renderAt('?a=1&b=2');
    await waitFor(() => screen.getByTestId('kpi-comparatif'));
    // CRITIQUE 5 -> 2 = amélioration (vert, -3).
    const crit = screen.getByTestId('kpi-nbEcartsCritique');
    expect(crit).toHaveTextContent('-3');
    expect(within(crit).getByText(/-3/).closest('td')?.className).toMatch(
      /green/,
    );
    // ATTENTION 2 -> 4 = dégradation (rouge, +2).
    const att = screen.getByTestId('kpi-nbEcartsAttention');
    expect(att).toHaveTextContent('+2');
    expect(within(att).getByText(/\+2/).closest('td')?.className).toMatch(/red/);
  });

  it('avertissement si périmètres différents (version)', async () => {
    mockDetail.mockImplementation((id: string) =>
      Promise.resolve(detail({ id, versionId: id === '1' ? '10' : '11' })),
    );
    renderAt('?a=1&b=2');
    await waitFor(() =>
      expect(screen.getByTestId('avertissement-perimetres')).toBeInTheDocument(),
    );
  });

  it('kpi_snapshot manquant : table comparative masquée', async () => {
    mockDetail.mockImplementation((id: string) =>
      Promise.resolve(detail({ id, kpiSnapshot: id === '2' ? null : { nbEcartsCritique: 1 } })),
    );
    renderAt('?a=1&b=2');
    await waitFor(() => screen.getByTestId('kpi-absent'));
    expect(screen.queryByTestId('kpi-comparatif')).not.toBeInTheDocument();
  });
});
