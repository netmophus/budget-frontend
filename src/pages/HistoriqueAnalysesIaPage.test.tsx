import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const permState = vi.hoisted(() => ({ hist: false }));
const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
vi.mock('@/lib/api/analyseIa', () => ({
  listerAnalysesIa: vi.fn(),
  supprimerAnalyseIa: vi.fn(),
  exporterPdfAnalyseHistorisee: vi.fn(),
}));
vi.mock('@/lib/auth/permissions', () => ({
  useHasPermission: (code: string) =>
    code === 'AI.HISTORIQUE' ? permState.hist : true,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
// Modal stubée — testée séparément.
vi.mock('@/components/analyse-ia/AnalyseIaDetailModal', () => ({
  AnalyseIaDetailModal: ({ id }: { id: string }) => (
    <div data-testid="detail-modal-stub">{id}</div>
  ),
}));

import {
  exporterPdfAnalyseHistorisee,
  listerAnalysesIa,
  type AnalyseIaListItem,
} from '@/lib/api/analyseIa';
import { HistoriqueAnalysesIaPage } from './HistoriqueAnalysesIaPage';

const mockLister = listerAnalysesIa as unknown as ReturnType<typeof vi.fn>;
const mockExport = exporterPdfAnalyseHistorisee as unknown as ReturnType<
  typeof vi.fn
>;

function item(id: string): AnalyseIaListItem {
  return {
    id,
    dateGeneration: '2027-02-01T10:00:00.000Z',
    demandeurEmail: 'admin@miznas.local',
    versionId: '10',
    scenarioId: '20',
    moisDebut: '2027-01',
    moisFin: '2027-03',
    modele: 'claude-sonnet-4-6',
    tokensIn: 1000,
    tokensOut: 2000,
    dureeMs: 500,
    coutEstime: 0.033,
    dryRun: false,
    resume: 'Diagnostic execution maitrisee.',
  };
}

describe('HistoriqueAnalysesIaPage (Chantier C2)', () => {
  beforeEach(() => {
    permState.hist = false;
    mockLister.mockResolvedValue({
      items: [item('1'), item('2')],
      total: 2,
      page: 1,
      limit: 20,
    });
  });
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('affiche la liste des analyses', async () => {
    render(<HistoriqueAnalysesIaPage />);
    await waitFor(() => screen.getByTestId('analyse-row-1'));
    expect(screen.getByTestId('analyse-row-2')).toBeInTheDocument();
  });

  it('un filtre période rappelle l’API', async () => {
    render(<HistoriqueAnalysesIaPage />);
    await waitFor(() => screen.getByTestId('analyse-row-1'));
    fireEvent.change(screen.getByTestId('f-mois-debut'), {
      target: { value: '2027-01' },
    });
    await waitFor(() =>
      expect(mockLister).toHaveBeenCalledWith(
        expect.objectContaining({ moisDebut: '2027-01' }),
      ),
    );
  });

  it('C-fix : clic Exporter PDF appelle le nouvel endpoint by-id', async () => {
    mockExport.mockResolvedValue(undefined);
    render(<HistoriqueAnalysesIaPage />);
    await waitFor(() => screen.getByTestId('export-1'));
    fireEvent.click(screen.getByTestId('export-1'));
    await waitFor(() => expect(mockExport).toHaveBeenCalledWith('1'));
  });

  it('C3 : cocher 2 analyses active Comparer + navigue avec ?a&b', async () => {
    render(<HistoriqueAnalysesIaPage />);
    await waitFor(() => screen.getByTestId('analyse-row-1'));
    // Bouton désactivé tant que 2 ne sont pas cochées.
    expect(screen.getByTestId('btn-comparer')).toBeDisabled();
    fireEvent.click(screen.getByTestId('compare-check-1'));
    fireEvent.click(screen.getByTestId('compare-check-2'));
    expect(screen.getByTestId('btn-comparer')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('btn-comparer'));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/execution/comparaison-analyses-ia?a=1&b=2',
    );
  });

  it('clic Voir ouvre le détail', async () => {
    render(<HistoriqueAnalysesIaPage />);
    await waitFor(() => screen.getByTestId('voir-1'));
    expect(screen.queryByTestId('detail-modal-stub')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('voir-1'));
    expect(screen.getByTestId('detail-modal-stub')).toHaveTextContent('1');
  });

  it('bouton Supprimer masqué sans AI.HISTORIQUE', async () => {
    permState.hist = false;
    render(<HistoriqueAnalysesIaPage />);
    await waitFor(() => screen.getByTestId('analyse-row-1'));
    expect(screen.queryByTestId('supprimer-1')).not.toBeInTheDocument();
  });

  it('bouton Supprimer visible avec AI.HISTORIQUE', async () => {
    permState.hist = true;
    render(<HistoriqueAnalysesIaPage />);
    await waitFor(() => screen.getByTestId('analyse-row-1'));
    expect(screen.getByTestId('supprimer-1')).toBeInTheDocument();
  });

  it('pagination : Suivant appelle l’API en page 2', async () => {
    mockLister.mockResolvedValue({
      items: [item('1')],
      total: 45,
      page: 1,
      limit: 20,
    });
    render(<HistoriqueAnalysesIaPage />);
    await waitFor(() => screen.getByTestId('analyse-row-1'));
    fireEvent.click(screen.getByTestId('page-suiv'));
    await waitFor(() =>
      expect(mockLister).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );
  });
});
