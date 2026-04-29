import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/referentiels', () => ({
  listComptes: vi.fn(),
  getCompteHistorique: vi.fn(),
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (msg: string) => toastError(msg) },
}));

import {
  listComptes,
  getCompteHistorique,
  type Compte,
} from '@/lib/api/referentiels';
import { ComptesPage } from './ComptesPage';

const mockList = listComptes as unknown as ReturnType<typeof vi.fn>;
const mockHistory = getCompteHistorique as unknown as ReturnType<typeof vi.fn>;

const SAMPLE: Compte[] = [
  {
    id: '1',
    codeCompte: '6',
    libelle: 'CHARGES',
    classe: 6,
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
    classe: 6,
    sousClasse: null,
    fkCompteParent: '1',
    parentCourant: { id: '1', codeCompte: '611', libelle: 'Rémunérations' },
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

describe('ComptesPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders comptes with classe badges and indented hierarchy', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });

    render(<ComptesPage />);

    await waitFor(() => {
      expect(screen.getByText('CHARGES')).toBeInTheDocument();
    });
    expect(screen.getByText('Salaires bruts')).toBeInTheDocument();
    expect(screen.getByText('MASSE_SALARIALE')).toBeInTheDocument();
  });

  it('calls listComptes with no filters on initial mount (page 1, limit 50)', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 });

    render(<ComptesPage />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 50,
          classe: undefined,
          search: undefined,
          estCompteCollectif: undefined,
          estPorteurInterets: undefined,
        }),
      );
    });
  });

  it('toggle "feuilles uniquement" passes estCompteCollectif=false to API', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 });

    render(<ComptesPage />);

    const toggle = await screen.findByLabelText(/feuilles uniquement/i);
    fireEvent.click(toggle);

    await waitFor(() => {
      const calls = mockList.mock.calls as Array<[Record<string, unknown>]>;
      const last = calls[calls.length - 1]![0];
      expect(last.estCompteCollectif).toBe(false);
    });
  });

  it('toggle "porteurs intérêts" passes estPorteurInterets=true', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 });

    render(<ComptesPage />);

    const toggle = await screen.findByLabelText(/porteurs d'intérêts/i);
    fireEvent.click(toggle);

    await waitFor(() => {
      const calls = mockList.mock.calls as Array<[Record<string, unknown>]>;
      const last = calls[calls.length - 1]![0];
      expect(last.estPorteurInterets).toBe(true);
    });
  });

  it('clicking a row opens the detail drawer', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });

    render(<ComptesPage />);

    await waitFor(() => {
      expect(screen.getByText('Salaires bruts')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Salaires bruts'));

    await waitFor(() => {
      expect(screen.getByText('Compte 611100')).toBeInTheDocument();
    });
    // Le footer contient le lien parent
    expect(screen.getByText(/Voir le parent : 611/)).toBeInTheDocument();
  });

  it('drawer "Voir l\'historique SCD2" calls getCompteHistorique', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    mockHistory.mockResolvedValue([SAMPLE[1]]);

    render(<ComptesPage />);

    await waitFor(() => {
      expect(screen.getByText('Salaires bruts')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Salaires bruts'));

    const histBtn = await screen.findByRole('button', {
      name: /historique scd2/i,
    });
    fireEvent.click(histBtn);

    await waitFor(() => {
      expect(mockHistory).toHaveBeenCalledWith('611100');
    });
  });

  it('shows toast on API error', async () => {
    mockList.mockRejectedValue(new Error('boom'));

    render(<ComptesPage />);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Impossible de charger les comptes');
    });
  });
});
