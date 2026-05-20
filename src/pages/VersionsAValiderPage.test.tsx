/**
 * Tests Vitest VersionsAValiderPage (refonte Lot 7.3).
 *
 * Couvre :
 *  - chargement liste + KPI + pill périmètre
 *  - affichage du montant total (fetch getResumeVersion par batch)
 *  - tolérance erreur résumé (affichage "—", pas de blocage)
 *  - justification vide → libellé "Aucune justification fournie."
 *  - click "Consulter la grille" → setVersionId + navigate('/budget/saisie')
 *  - click "Voir l'historique workflow" → <details> + WorkflowTimeline
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/lib/api/versions', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/versions')
  >('@/lib/api/versions');
  return {
    ...actual,
    listVersions: vi.fn(),
    getResumeVersion: vi.fn(),
    getMonPerimetre: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

import {
  getMonPerimetre,
  getResumeVersion,
  listVersions,
  type Version,
} from '@/lib/api/versions';
import { useBudgetGrilleStore } from '@/lib/stores/budget-grille-store';
import { VersionsAValiderPage } from './VersionsAValiderPage';

const mockList = listVersions as unknown as ReturnType<typeof vi.fn>;
const mockResume = getResumeVersion as unknown as ReturnType<typeof vi.fn>;
const mockPerimetre = getMonPerimetre as unknown as ReturnType<typeof vi.fn>;

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

function renderPage() {
  return render(
    <MemoryRouter>
      <VersionsAValiderPage />
    </MemoryRouter>,
  );
}

/** Strip tous les whitespace (espace, NBSP, etc.) pour des assertions
 *  sans dépendance au séparateur exact d'Intl.NumberFormat('fr-FR'). */
function digitsOnly(s: string | null | undefined): string {
  return (s ?? '').replace(/\s/g, '');
}

describe('VersionsAValiderPage (Lot 7.3)', () => {
  beforeEach(() => {
    mockPerimetre.mockResolvedValue({
      nbCrAccessibles: 12,
      isAdminGlobal: false,
    });
    mockResume.mockResolvedValue({
      versionId: '1',
      montantTotalFcfa: 30_000_000,
      nombreComptes: 5,
      nombreLignes: 60,
    });
    useBudgetGrilleStore.getState().reset();
  });
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('appelle listVersions avec statut=soumis', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 100 });
    renderPage();
    await waitFor(() =>
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ statut: 'soumis' }),
      ),
    );
  });

  it('liste vide → empty state', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 100 });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('empty-state')).toBeInTheDocument(),
    );
  });

  it('affiche la pill "Mon périmètre (12 CR)"', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 100 });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('pill-perimetre')).toHaveTextContent(
        /Mon périmètre \(12 CR\)/,
      ),
    );
  });

  it('admin global → pill "Admin global"', async () => {
    mockPerimetre.mockResolvedValue({
      nbCrAccessibles: 42,
      isAdminGlobal: true,
    });
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 100 });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('pill-perimetre')).toHaveTextContent(
        /Admin global/,
      ),
    );
  });

  it('affiche le montant total formaté FR', async () => {
    mockList.mockResolvedValue({
      items: [makeVersion()],
      total: 1,
      page: 1,
      limit: 100,
    });
    renderPage();
    const cell = await screen.findByTestId('montant-BUDGET_INITIAL_2026');
    await waitFor(() => expect(digitsOnly(cell.textContent)).toBe('30000000'));
  });

  it('résumé en erreur → affiche "—" et continue', async () => {
    mockList.mockResolvedValue({
      items: [makeVersion()],
      total: 1,
      page: 1,
      limit: 100,
    });
    mockResume.mockRejectedValue(new Error('404'));
    renderPage();
    const cell = await screen.findByTestId('montant-BUDGET_INITIAL_2026');
    await waitFor(() => expect(cell).toHaveTextContent('—'));
  });

  it('justification présente : affiche le commentaireSoumission', async () => {
    mockList.mockResolvedValue({
      items: [makeVersion()],
      total: 1,
      page: 1,
      limit: 100,
    });
    renderPage();
    const card = await screen.findByTestId('row-BUDGET_INITIAL_2026');
    expect(card).toHaveTextContent('Prêt pour validation');
  });

  it('justification vide → libellé "Aucune justification fournie."', async () => {
    mockList.mockResolvedValue({
      items: [makeVersion({ commentaireSoumission: null })],
      total: 1,
      page: 1,
      limit: 100,
    });
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByText(/Aucune justification fournie\./i),
      ).toBeInTheDocument(),
    );
  });

  it('click "Consulter la grille" → setVersionId + navigate', async () => {
    mockList.mockResolvedValue({
      items: [makeVersion()],
      total: 1,
      page: 1,
      limit: 100,
    });
    renderPage();
    const btn = await screen.findByTestId(
      'btn-consulter-BUDGET_INITIAL_2026',
    );
    fireEvent.click(btn);
    expect(useBudgetGrilleStore.getState().versionId).toBe('1');
    expect(mockNavigate).toHaveBeenCalledWith('/budget/saisie');
  });

  it('historique workflow : <details> contient WorkflowTimeline', async () => {
    mockList.mockResolvedValue({
      items: [makeVersion()],
      total: 1,
      page: 1,
      limit: 100,
    });
    renderPage();
    const details = await screen.findByTestId(
      'historique-BUDGET_INITIAL_2026',
    );
    expect(details).toBeInTheDocument();
    expect(details).toHaveTextContent(/Création/);
    expect(details).toHaveTextContent(/Soumission/);
  });
});
