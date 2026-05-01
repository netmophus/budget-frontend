import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('@/lib/api/referentiels', () => ({
  listSegments: vi.fn(),
  getSegmentHistorique: vi.fn(),
  createSegment: vi.fn(),
  updateSegment: vi.fn(),
  deleteSegment: vi.fn(),
}));

// Lot 2.5B : la page utilise useRefSecondaireOptions pour le filtre
// catégorie. Mock no-op pour éviter les fetch axios en jsdom.
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
  deleteSegment,
  getSegmentHistorique,
  listSegments,
  type Segment,
} from '@/lib/api/referentiels';
import { SegmentsPage } from './SegmentsPage';
import { useHasPermission } from '@/lib/auth/permissions';

const mockList = listSegments as unknown as ReturnType<typeof vi.fn>;
const mockHistory = getSegmentHistorique as unknown as ReturnType<typeof vi.fn>;
const mockDelete = deleteSegment as unknown as ReturnType<typeof vi.fn>;
const mockHasPermission = useHasPermission as unknown as ReturnType<typeof vi.fn>;

const SAMPLE: Segment[] = [
  {
    id: '1',
    codeSegment: 'PARTICULIER',
    libelle: 'Particuliers',
    categorie: 'particulier',
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
    codeSegment: 'PME',
    libelle: 'Petites et moyennes entreprises',
    categorie: 'pme',
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

describe('SegmentsPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it('renders segments with categorie badges', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<SegmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('PARTICULIER')).toBeInTheDocument();
    });
    expect(
      screen.getByText('Petites et moyennes entreprises'),
    ).toBeInTheDocument();
    // "PME" apparaît 2× : code + badge catégorie
    expect(screen.getAllByText('PME').length).toBe(2);
    // Le badge catégorie 'Particulier' uniquement
    expect(screen.getByText('Particulier')).toBeInTheDocument();
  });

  it('initial mount calls listSegments without filters', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 });
    render(<SegmentsPage />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 50,
          categorie: undefined,
          search: undefined,
        }),
      );
    });
  });

  it('clicking a row opens the detail drawer (no parent link)', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<SegmentsPage />);

    await waitFor(() => {
      expect(
        screen.getByText('Petites et moyennes entreprises'),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Petites et moyennes entreprises'));

    await waitFor(() => {
      expect(screen.getByText('Segment PME')).toBeInTheDocument();
    });
    // dim_segment est plat : pas de lien parent
    expect(screen.queryByText(/Voir le parent/)).not.toBeInTheDocument();
  });

  it('drawer history button calls getSegmentHistorique', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    mockHistory.mockResolvedValue([SAMPLE[1]]);

    render(<SegmentsPage />);
    await waitFor(() => {
      expect(
        screen.getByText('Petites et moyennes entreprises'),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Petites et moyennes entreprises'));

    const histBtn = await screen.findByRole('button', {
      name: /historique scd2/i,
    });
    fireEvent.click(histBtn);

    await waitFor(() => {
      expect(mockHistory).toHaveBeenCalledWith('PME');
    });
  });

  it('shows toast on API error', async () => {
    mockList.mockRejectedValue(new Error('boom'));
    render(<SegmentsPage />);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Impossible de charger les segments',
      );
    });
  });

  // ─── Lot 2.5B : CRUD actions

  it('bouton "Nouveau segment" visible pour admin', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<SegmentsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Nouveau segment/i }),
      ).toBeInTheDocument();
    });
  });

  it('LECTEUR : pas de bouton "Nouveau segment"', async () => {
    mockHasPermission.mockReturnValue(false);
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<SegmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('PARTICULIER')).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: /Nouveau segment/i }),
    ).not.toBeInTheDocument();
  });

  it('drawer admin : boutons Modifier + Désactiver visibles', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<SegmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('PARTICULIER')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('PARTICULIER'));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Modifier/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /Désactiver/i }),
    ).toBeInTheDocument();
  });

  it('LECTEUR : drawer SANS boutons Modifier/Désactiver', async () => {
    mockHasPermission.mockReturnValue(false);
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<SegmentsPage />);

    await waitFor(() => {
      expect(screen.getByText('PARTICULIER')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('PARTICULIER'));

    await waitFor(() => {
      expect(screen.getByText('Segment PARTICULIER')).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: /Modifier/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Désactiver/i }),
    ).not.toBeInTheDocument();
  });

  it('Désactiver → modale → DELETE → toast succès', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    mockDelete.mockResolvedValue(undefined);

    render(<SegmentsPage />);
    await waitFor(() => {
      expect(screen.getByText('PARTICULIER')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('PARTICULIER'));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Désactiver/i }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Désactiver/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/Désactiver le segment PARTICULIER/i),
      ).toBeInTheDocument();
    });
    const buttons = screen.getAllByRole('button', { name: /Désactiver/i });
    fireEvent.click(buttons[buttons.length - 1]!);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('PARTICULIER');
    });
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringMatching(/PARTICULIER.*désactivé/i),
      );
    });
  });

  it('Désactiver 409 → toast erreur', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    mockDelete.mockRejectedValue(
      buildAxiosError(409, 'Segment référencé'),
    );

    render(<SegmentsPage />);
    await waitFor(() => {
      expect(screen.getByText('PARTICULIER')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('PARTICULIER'));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Désactiver/i }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Désactiver/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/Désactiver le segment PARTICULIER/i),
      ).toBeInTheDocument();
    });
    const buttons = screen.getAllByRole('button', { name: /Désactiver/i });
    fireEvent.click(buttons[buttons.length - 1]!);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        expect.stringMatching(/Segment référencé/),
      );
    });
  });
});
