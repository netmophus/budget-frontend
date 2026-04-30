import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/api/versions', () => ({
  listVersions: vi.fn(),
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (m: string) => toastError(m) },
}));

vi.mock('@/lib/auth/permissions', () => ({
  useHasPermission: vi.fn(() => true),
}));

import { listVersions, type Version } from '@/lib/api/versions';
import { VersionsPage } from './VersionsPage';
import { useHasPermission } from '@/lib/auth/permissions';

const mockList = listVersions as unknown as ReturnType<typeof vi.fn>;
const mockHasPermission = useHasPermission as unknown as ReturnType<
  typeof vi.fn
>;

const SAMPLE: Version[] = [
  {
    id: '1',
    codeVersion: 'BUDGET_INITIAL_2026',
    libelle: 'Budget initial 2026',
    typeVersion: 'budget_initial',
    exerciceFiscal: 2026,
    statut: 'ouvert',
    dateGel: null,
    utilisateurGel: null,
    commentaire: 'Cadrage initial DG',
    dateCreation: '2026-01-01T10:00:00Z',
    utilisateurCreation: 'system',
    dateModification: null,
    utilisateurModification: null,
  },
  {
    id: '2',
    codeVersion: 'RF1_2025',
    libelle: 'Reforecast 1 — 2025',
    typeVersion: 'reforecast_1',
    exerciceFiscal: 2025,
    statut: 'gele',
    dateGel: '2025-06-30T18:00:00Z',
    utilisateurGel: 'admin@miznas.local',
    commentaire: null,
    dateCreation: '2025-01-01T10:00:00Z',
    utilisateurCreation: 'system',
    dateModification: null,
    utilisateurModification: null,
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <VersionsPage />
    </MemoryRouter>,
  );
}

describe('VersionsPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it('charge les versions et affiche les badges type + statut', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 20 });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('BUDGET_INITIAL_2026')).toBeInTheDocument();
    });
    expect(screen.getByText('Budget initial')).toBeInTheDocument();
    expect(screen.getByText('Reforecast 1')).toBeInTheDocument();
    expect(screen.getByText('Ouvert')).toBeInTheDocument();
    expect(screen.getByText('Gelé')).toBeInTheDocument();
  });

  it('affiche le bouton Saisir uniquement pour version ouvert + permission', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 20 });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('BUDGET_INITIAL_2026')).toBeInTheDocument();
    });
    const saisirButtons = screen.getAllByRole('button', { name: /saisir/i });
    // Seule la version 'ouvert' a un bouton Saisir
    expect(saisirButtons).toHaveLength(1);
  });

  it('cache le bouton Saisir si pas de permission', async () => {
    mockHasPermission.mockReturnValue(false);
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 20 });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('BUDGET_INITIAL_2026')).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: /saisir/i }),
    ).not.toBeInTheDocument();
  });

  it('clic sur le bouton Saisir navigue vers /budget/versions/:code/saisie', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 20 });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('BUDGET_INITIAL_2026')).toBeInTheDocument();
    });
    const btn = screen.getByRole('button', { name: /saisir/i });
    fireEvent.click(btn);
    expect(navigate).toHaveBeenCalledWith(
      '/budget/versions/BUDGET_INITIAL_2026/saisie',
    );
  });

  it('clic sur une ligne ouvre le drawer détail', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 20 });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Budget initial 2026')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Budget initial 2026'));

    await waitFor(() => {
      expect(
        screen.getByText('Version BUDGET_INITIAL_2026'),
      ).toBeInTheDocument();
    });
  });

  it('toast erreur si l’API échoue', async () => {
    mockList.mockRejectedValue(new Error('boom'));

    renderPage();

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Impossible de charger les versions',
      );
    });
  });

  it('appelle listVersions avec page=1, limit=20 au mount', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

    renderPage();

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20 }),
      );
    });
  });
});
