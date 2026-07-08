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
}));
vi.mock('@/lib/api/tableau-bord', () => ({ exporterEcartsPdf: vi.fn() }));
vi.mock('@/lib/auth/permissions', () => ({
  useHasPermission: (code: string) =>
    code === 'AI.HISTORIQUE' ? permState.hist : true,
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import {
  getAnalyseIaDetail,
  type AnalyseIaDetail,
} from '@/lib/api/analyseIa';
import { exporterEcartsPdf } from '@/lib/api/tableau-bord';
import { AnalyseIaDetailModal } from './AnalyseIaDetailModal';

const mockDetail = getAnalyseIaDetail as unknown as ReturnType<typeof vi.fn>;
const mockExport = exporterEcartsPdf as unknown as ReturnType<typeof vi.fn>;

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

  it('Exporter PDF appelle exporterEcartsPdf avec filtres + snapshot', async () => {
    render(
      <AnalyseIaDetailModal id="1" onClose={vi.fn()} onDeleted={vi.fn()} />,
    );
    await waitFor(() => screen.getByTestId('btn-export-pdf'));
    fireEvent.click(screen.getByTestId('btn-export-pdf'));
    await waitFor(() => expect(mockExport).toHaveBeenCalledTimes(1));
    expect(mockExport).toHaveBeenCalledWith(
      expect.objectContaining({ versionId: '10', moisDebut: '2027-01' }),
      expect.objectContaining({ analyse: DETAIL.reponseMarkdown, model: 'claude-sonnet-4-6' }),
    );
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
