import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/referentiels', () => ({
  listDevises: vi.fn(),
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (msg: string) => toastError(msg) },
}));

import { listDevises, type Devise } from '@/lib/api/referentiels';
import { DevisesPage } from './DevisesPage';

const mockListDevises = listDevises as unknown as ReturnType<typeof vi.fn>;

const SAMPLE: Devise[] = [
  {
    id: '1',
    codeIso: 'XOF',
    libelle: 'Franc CFA BCEAO',
    symbole: 'F CFA',
    nbDecimales: 0,
    estDevisePivot: true,
    estActive: true,
    dateCreation: '2026-04-01T10:00:00Z',
    utilisateurCreation: 'system',
    dateModification: null,
    utilisateurModification: null,
  },
  {
    id: '2',
    codeIso: 'EUR',
    libelle: 'Euro',
    symbole: '€',
    nbDecimales: 2,
    estDevisePivot: false,
    estActive: true,
    dateCreation: '2026-04-01T10:00:00Z',
    utilisateurCreation: 'system',
    dateModification: null,
    utilisateurModification: null,
  },
];

describe('DevisesPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('mounts and renders the devises with a PIVOT badge on XOF', async () => {
    mockListDevises.mockResolvedValue({
      items: SAMPLE,
      total: 2,
      page: 1,
      limit: 100,
    });

    render(<DevisesPage />);

    await waitFor(() => {
      expect(screen.getByText('XOF')).toBeInTheDocument();
    });
    expect(screen.getByText('Euro')).toBeInTheDocument();
    expect(screen.getByText('PIVOT')).toBeInTheDocument();
  });

  it('calls listDevises with estActive=true on mount', async () => {
    mockListDevises.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 100,
    });

    render(<DevisesPage />);

    await waitFor(() => {
      expect(mockListDevises).toHaveBeenCalledWith(
        expect.objectContaining({ estActive: true }),
      );
    });
  });

  it('falls back to a toast on API error', async () => {
    mockListDevises.mockRejectedValue(new Error('boom'));

    render(<DevisesPage />);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Impossible de charger les devises',
      );
    });
  });
});
