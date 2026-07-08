import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const permState = vi.hoisted(() => ({ hist: false }));

vi.mock('@/lib/api/analyseIa', () => ({
  getAnalyseIaDetail: vi.fn(),
  supprimerAnalyseIa: vi.fn(),
  exporterPdfAnalyseHistorisee: vi.fn(),
}));
vi.mock('@/lib/auth/permissions', () => ({
  useHasPermission: (code: string) =>
    code === 'AI.HISTORIQUE' ? permState.hist : true,
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { toast } from 'sonner';
import {
  exporterPdfAnalyseHistorisee,
  getAnalyseIaDetail,
  type AnalyseIaDetail,
} from '@/lib/api/analyseIa';
import { AnalyseIaDetailModal } from './AnalyseIaDetailModal';

const mockDetail = getAnalyseIaDetail as unknown as ReturnType<typeof vi.fn>;
const mockExport = exporterPdfAnalyseHistorisee as unknown as ReturnType<
  typeof vi.fn
>;
const mockToastInfo = toast.info as unknown as ReturnType<typeof vi.fn>;

const DETAIL: AnalyseIaDetail = {
  id: '1',
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
  resume: 'r',
  crsSelectionnes: null,
  promptVersion: 'chantier-a-v1',
  reponseMarkdown: '## Diagnostic\nExecution maitrisee.',
  kpiSnapshot: { nbEcartsCritique: 2 },
  hasDataset: true,
};

describe('AnalyseIaDetailModal (Chantier C2)', () => {
  beforeEach(() => {
    permState.hist = false;
    mockDetail.mockResolvedValue(DETAIL);
    mockExport.mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('rend le markdown de l’analyse', async () => {
    render(
      <AnalyseIaDetailModal id="1" onClose={vi.fn()} onDeleted={vi.fn()} />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('analyse-ia-markdown')).toHaveTextContent(
        'Diagnostic',
      ),
    );
    expect(screen.getByTestId('kpi-snapshot')).toHaveTextContent('CRITIQUE');
  });

  it('C-fix : Exporter PDF appelle le nouvel endpoint by-id', async () => {
    render(
      <AnalyseIaDetailModal id="1" onClose={vi.fn()} onDeleted={vi.fn()} />,
    );
    await waitFor(() => screen.getByTestId('btn-export-pdf'));
    fireEvent.click(screen.getByTestId('btn-export-pdf'));
    await waitFor(() => expect(mockExport).toHaveBeenCalledWith('1'));
  });

  it('C-fix : pas de mention "recalcul" si hasDataset', async () => {
    mockDetail.mockResolvedValue({ ...DETAIL, hasDataset: true });
    render(
      <AnalyseIaDetailModal id="1" onClose={vi.fn()} onDeleted={vi.fn()} />,
    );
    await waitFor(() => screen.getByTestId('btn-export-pdf'));
    fireEvent.click(screen.getByTestId('btn-export-pdf'));
    await waitFor(() => expect(mockToastInfo).toHaveBeenCalled());
    expect(mockToastInfo.mock.calls[0][0]).not.toMatch(/recalcul/i);
  });

  it('C-fix : mention "recalcul" si !hasDataset (ancienne analyse)', async () => {
    mockDetail.mockResolvedValue({ ...DETAIL, hasDataset: false });
    render(
      <AnalyseIaDetailModal id="1" onClose={vi.fn()} onDeleted={vi.fn()} />,
    );
    await waitFor(() => screen.getByTestId('btn-export-pdf'));
    fireEvent.click(screen.getByTestId('btn-export-pdf'));
    await waitFor(() => expect(mockToastInfo).toHaveBeenCalled());
    expect(mockToastInfo.mock.calls[0][0]).toMatch(/recalcul/i);
  });

  it('bouton Supprimer masqué sans AI.HISTORIQUE', async () => {
    permState.hist = false;
    render(
      <AnalyseIaDetailModal id="1" onClose={vi.fn()} onDeleted={vi.fn()} />,
    );
    await waitFor(() => screen.getByTestId('btn-export-pdf'));
    expect(screen.queryByTestId('btn-supprimer-analyse')).not.toBeInTheDocument();
  });

  it('bouton Supprimer visible avec AI.HISTORIQUE', async () => {
    permState.hist = true;
    render(
      <AnalyseIaDetailModal id="1" onClose={vi.fn()} onDeleted={vi.fn()} />,
    );
    await waitFor(() => screen.getByTestId('btn-supprimer-analyse'));
    expect(screen.getByTestId('btn-supprimer-analyse')).toBeInTheDocument();
  });
});
