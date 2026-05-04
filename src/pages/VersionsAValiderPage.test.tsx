/**
 * Tests Vitest VersionsAValiderPage (Lot 3.5).
 */
import {
  cleanup,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/versions', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/versions')
  >('@/lib/api/versions');
  return {
    ...actual,
    listVersions: vi.fn(),
  };
});

vi.mock('@/components/budget/WorkflowActions', () => ({
  WorkflowActions: ({ version }: { version: { codeVersion: string } }) => (
    <div data-testid={`actions-${version.codeVersion}`}>actions</div>
  ),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

import { listVersions, type Version } from '@/lib/api/versions';
import { VersionsAValiderPage } from './VersionsAValiderPage';

const mockList = listVersions as unknown as ReturnType<typeof vi.fn>;

function makeVersion(over: Partial<Version> = {}): Version {
  return {
    id: '1',
    codeVersion: 'BUDGET_INITIAL_2026',
    libelle: 'Budget initial 2026',
    typeVersion: 'budget_initial',
    exerciceFiscal: 2026,
    statut: 'soumis',
    dateGel: null,
    utilisateurGel: null,
    commentaire: null,
    dateCreation: '2026-01-01T10:00:00Z',
    utilisateurCreation: 'system',
    dateModification: null,
    utilisateurModification: null,
    commentaireSoumission: 'Prêt pour validation',
    commentaireValidation: null,
    commentaireRejet: null,
    commentairePublication: null,
    dateSoumission: '2026-02-01T10:00:00Z',
    utilisateurSoumission: 'preparateur@miznas.local',
    dateValidation: null,
    utilisateurValidation: null,
    dateRejet: null,
    utilisateurRejet: null,
    ...over,
  };
}

describe('VersionsAValiderPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('appelle listVersions avec statut=soumis', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 100 });
    render(<VersionsAValiderPage />);
    await waitFor(() =>
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ statut: 'soumis' }),
      ),
    );
  });

  it("liste vide → empty state", async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 100 });
    render(<VersionsAValiderPage />);
    await waitFor(() =>
      expect(screen.getByTestId('empty-state')).toBeInTheDocument(),
    );
  });

  it('affiche les versions et leur commentaire de soumission', async () => {
    mockList.mockResolvedValue({
      items: [makeVersion()],
      total: 1,
      page: 1,
      limit: 100,
    });
    render(<VersionsAValiderPage />);
    await waitFor(() =>
      expect(
        screen.getByTestId('row-BUDGET_INITIAL_2026'),
      ).toBeInTheDocument(),
    );
    // Le commentaire est rendu dans le résumé ET dans la timeline
    // (rendue dans le <details>) — au moins une occurrence suffit.
    expect(
      screen.getAllByText(/Prêt pour validation/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/preparateur@miznas\.local/).length,
    ).toBeGreaterThan(0);
  });

  it("intègre le composant WorkflowActions pour chaque version", async () => {
    mockList.mockResolvedValue({
      items: [makeVersion()],
      total: 1,
      page: 1,
      limit: 100,
    });
    render(<VersionsAValiderPage />);
    await waitFor(() =>
      expect(
        screen.getByTestId('actions-BUDGET_INITIAL_2026'),
      ).toBeInTheDocument(),
    );
  });
});
