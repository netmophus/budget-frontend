import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('@/lib/api/referentiels', () => ({
  listLignesMetier: vi.fn(),
  getLigneMetierHistorique: vi.fn(),
  createLigneMetier: vi.fn(),
  updateLigneMetier: vi.fn(),
  deleteLigneMetier: vi.fn(),
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
  deleteLigneMetier,
  getLigneMetierHistorique,
  listLignesMetier,
  type LigneMetier,
} from '@/lib/api/referentiels';
import { LignesMetierPage } from './LignesMetierPage';
import { useHasPermission } from '@/lib/auth/permissions';

const mockList = listLignesMetier as unknown as ReturnType<typeof vi.fn>;
const mockHistory = getLigneMetierHistorique as unknown as ReturnType<
  typeof vi.fn
>;
const mockDelete = deleteLigneMetier as unknown as ReturnType<typeof vi.fn>;
const mockHasPermission = useHasPermission as unknown as ReturnType<
  typeof vi.fn
>;

const SAMPLE: LigneMetier[] = [
  {
    id: '1',
    codeLigneMetier: 'RETAIL',
    libelle: 'Banque de détail',
    fkLigneMetierParent: null,
    niveau: 1,
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
    codeLigneMetier: 'RETAIL_PARTICULIERS',
    libelle: 'Particuliers',
    fkLigneMetierParent: '1',
    parentCourant: {
      id: '1',
      codeLigneMetier: 'RETAIL',
      libelle: 'Banque de détail',
    },
    niveau: 2,
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

describe('LignesMetierPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it('renders lignes-métier with hierarchy', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<LignesMetierPage />);

    await waitFor(() => {
      expect(screen.getByText('Banque de détail')).toBeInTheDocument();
    });
    expect(screen.getByText('Particuliers')).toBeInTheDocument();
  });

  it('debounced search calls API', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 });
    render(<LignesMetierPage />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });
  });

  it('clicking a row opens the detail drawer with parent link', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<LignesMetierPage />);

    await waitFor(() => {
      expect(screen.getByText('Particuliers')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Particuliers'));

    await waitFor(() => {
      expect(
        screen.getByText('Ligne métier RETAIL_PARTICULIERS'),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Voir le parent : RETAIL/)).toBeInTheDocument();
  });

  it('drawer history button calls getLigneMetierHistorique', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    mockHistory.mockResolvedValue([SAMPLE[0]]);

    render(<LignesMetierPage />);
    await waitFor(() => {
      expect(screen.getByText('Banque de détail')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Banque de détail'));

    const histBtn = await screen.findByRole('button', {
      name: /historique scd2/i,
    });
    fireEvent.click(histBtn);

    await waitFor(() => {
      expect(mockHistory).toHaveBeenCalledWith('RETAIL');
    });
  });

  it('shows toast on API error', async () => {
    mockList.mockRejectedValue(new Error('boom'));
    render(<LignesMetierPage />);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Impossible de charger les lignes de métier',
      );
    });
  });

  // ─── Lot 2.5D : CRUD actions

  it('bouton "Nouvelle ligne métier" visible pour admin', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<LignesMetierPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Nouvelle ligne métier/i }),
      ).toBeInTheDocument();
    });
  });

  it('LECTEUR : pas de bouton "Nouvelle ligne métier"', async () => {
    mockHasPermission.mockReturnValue(false);
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<LignesMetierPage />);

    await waitFor(() => {
      expect(screen.getByText('Banque de détail')).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: /Nouvelle ligne métier/i }),
    ).not.toBeInTheDocument();
  });

  it('drawer admin : boutons Modifier + Désactiver visibles', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<LignesMetierPage />);

    await waitFor(() => {
      expect(screen.getByText('Banque de détail')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Banque de détail'));

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
      buildAxiosError(409, 'Ligne métier référencée par des enfants courants'),
    );

    render(<LignesMetierPage />);
    await waitFor(() => {
      expect(screen.getByText('Banque de détail')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Banque de détail'));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Désactiver/i }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Désactiver/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/Désactiver la ligne métier RETAIL/i),
      ).toBeInTheDocument();
    });
    const buttons = screen.getAllByRole('button', { name: /Désactiver/i });
    fireEvent.click(buttons[buttons.length - 1]!);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        expect.stringMatching(/référencée par des enfants/),
      );
    });
  });
});
