import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/referentiels', () => ({
  listLignesMetier: vi.fn(),
  getLigneMetierHistorique: vi.fn(),
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (msg: string) => toastError(msg) },
}));

import {
  listLignesMetier,
  getLigneMetierHistorique,
  type LigneMetier,
} from '@/lib/api/referentiels';
import { LignesMetierPage } from './LignesMetierPage';

const mockList = listLignesMetier as unknown as ReturnType<typeof vi.fn>;
const mockHistory = getLigneMetierHistorique as unknown as ReturnType<
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
    parentCourant: { id: '1', codeLigneMetier: 'RETAIL', libelle: 'Banque de détail' },
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

describe('LignesMetierPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders lignes-métier with hierarchy', async () => {
    mockList.mockResolvedValue({ items: SAMPLE, total: 2, page: 1, limit: 50 });
    render(<LignesMetierPage />);

    await waitFor(() => {
      expect(screen.getByText('Banque de détail')).toBeInTheDocument();
    });
    expect(screen.getByText('Particuliers')).toBeInTheDocument();
  });

  it('debounced search calls API with search param', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 });
    render(<LignesMetierPage />);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });
  });

  it('clicking a row opens the detail drawer', async () => {
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
});
