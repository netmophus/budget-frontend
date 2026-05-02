import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('@/lib/api/referentiels', () => ({
  listComptes: vi.fn(),
  getCompteHistorique: vi.fn(),
  createCompte: vi.fn(),
  updateCompte: vi.fn(),
  deleteCompte: vi.fn(),
  importComptes: vi.fn(),
}));

vi.mock('@/lib/api/configuration', () => ({
  listRefSecondaires: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    limit: 200,
  }),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
const toastInfo = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (m: string) => toastError(m),
    success: (m: string) => toastSuccess(m),
    info: (m: string) => toastInfo(m),
  },
}));

vi.mock('@/lib/auth/permissions', () => ({
  useHasPermission: vi.fn(() => true),
}));

import {
  type Compte,
  deleteCompte,
  getCompteHistorique,
  listComptes,
} from '@/lib/api/referentiels';
import { ComptesPage } from './ComptesPage';
import { useHasPermission } from '@/lib/auth/permissions';

const mockList = listComptes as unknown as ReturnType<typeof vi.fn>;
const mockHistory = getCompteHistorique as unknown as ReturnType<typeof vi.fn>;
const mockDelete = deleteCompte as unknown as ReturnType<typeof vi.fn>;
const mockHasPermission = useHasPermission as unknown as ReturnType<
  typeof vi.fn
>;

const SAMPLE: Compte[] = [
  {
    id: '1',
    codeCompte: '6',
    libelle: 'CHARGES',
    classe: '6',
    sousClasse: null,
    fkCompteParent: null,
    niveau: 1,
    sens: 'D',
    codePosteBudgetaire: null,
    estCompteCollectif: true,
    estPorteurInterets: false,
    versionCourante: true,
    dateDebutValidite: '2026-04-15',
    dateFinValidite: null,
    estActif: true,
    dateCreation: '2026-04-15T10:00:00Z',
    utilisateurCreation: 'system',
    dateModification: null,
    utilisateurModification: null,
  },
  {
    id: '2',
    codeCompte: '611100',
    libelle: 'Salaires bruts',
    classe: '6',
    sousClasse: '61',
    fkCompteParent: '1',
    parentCourant: { id: '1', codeCompte: '6', libelle: 'CHARGES' },
    niveau: 4,
    sens: 'D',
    codePosteBudgetaire: 'MASSE_SALARIALE',
    estCompteCollectif: false,
    estPorteurInterets: false,
    versionCourante: true,
    dateDebutValidite: '2026-04-15',
    dateFinValidite: null,
    estActif: true,
    dateCreation: '2026-04-15T10:00:00Z',
    utilisateurCreation: 'system',
    dateModification: null,
    utilisateurModification: null,
  },
];

function buildAxiosError(status: number, message: string): AxiosError {
  return new AxiosError(message, String(status), undefined, undefined, {
    status,
    data: { statusCode: status, message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() } as never,
  });
}

describe('ComptesPage', () => {
  beforeEach(() => {
    mockHasPermission.mockReturnValue(true);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders comptes with hierarchy + classe badge', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<ComptesPage />);

    await waitFor(() => {
      expect(screen.getByText('CHARGES')).toBeInTheDocument();
    });
    expect(screen.getByText('Salaires bruts')).toBeInTheDocument();
  });

  it('initial mount calls listComptes', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 });
    render(<ComptesPage />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });
  });

  it('clicking a row opens the detail drawer with parent link', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<ComptesPage />);

    await waitFor(() => {
      expect(screen.getByText('Salaires bruts')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Salaires bruts'));

    await waitFor(() => {
      expect(screen.getByText('Compte 611100')).toBeInTheDocument();
    });
    expect(screen.getByText(/Voir le parent : 6/)).toBeInTheDocument();
  });

  it('drawer history button calls getCompteHistorique', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    mockHistory.mockResolvedValue([SAMPLE[0]]);

    render(<ComptesPage />);
    await waitFor(() => {
      expect(screen.getByText('CHARGES')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('CHARGES'));

    const histBtn = await screen.findByRole('button', {
      name: /historique scd2/i,
    });
    fireEvent.click(histBtn);

    await waitFor(() => {
      expect(mockHistory).toHaveBeenCalledWith('6');
    });
  });

  it('shows toast on API error', async () => {
    mockList.mockRejectedValue(new Error('boom'));
    render(<ComptesPage />);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Impossible de charger les comptes',
      );
    });
  });

  // ─── Lot 2.5E : CRUD actions

  it('admin : 2 boutons "Nouveau compte" + "Importer CSV"', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<ComptesPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Nouveau compte/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /Importer CSV/i }),
    ).toBeInTheDocument();
  });

  it('LECTEUR : pas de bouton Nouveau ni Importer', async () => {
    mockHasPermission.mockReturnValue(false);
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<ComptesPage />);

    await waitFor(() => {
      expect(screen.getByText('CHARGES')).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: /Nouveau compte/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Importer CSV/i }),
    ).not.toBeInTheDocument();
  });

  it('drawer admin : Modifier + Désactiver visibles sur compte actif', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<ComptesPage />);

    await waitFor(() => {
      expect(screen.getByText('CHARGES')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('CHARGES'));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Modifier/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /Désactiver/i }),
    ).toBeInTheDocument();
  });

  it('Désactiver 409 enfants → toast erreur', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    mockDelete.mockRejectedValue(
      buildAxiosError(409, 'Compte référencé par des enfants courants'),
    );

    render(<ComptesPage />);
    await waitFor(() => {
      expect(screen.getByText('CHARGES')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('CHARGES'));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Désactiver/i }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Désactiver/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/Désactiver le compte 6/i),
      ).toBeInTheDocument();
    });
    const buttons = screen.getAllByRole('button', { name: /Désactiver/i });
    fireEvent.click(buttons[buttons.length - 1]!);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        expect.stringMatching(/référencé par des enfants/),
      );
    });
  });
});
