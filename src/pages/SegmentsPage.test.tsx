import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/referentiels', () => ({
  listSegments: vi.fn(),
  getSegmentHistorique: vi.fn(),
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (msg: string) => toastError(msg) },
}));

import {
  listSegments,
  getSegmentHistorique,
  type Segment,
} from '@/lib/api/referentiels';
import { SegmentsPage } from './SegmentsPage';

const mockList = listSegments as unknown as ReturnType<typeof vi.fn>;
const mockHistory = getSegmentHistorique as unknown as ReturnType<typeof vi.fn>;

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

describe('SegmentsPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
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
});
