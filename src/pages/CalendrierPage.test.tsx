import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/referentiels', () => ({
  listJoursTemps: vi.fn(),
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (msg: string) => toastError(msg) },
}));

import { listJoursTemps, type JourTemps } from '@/lib/api/referentiels';
import { CalendrierPage } from './CalendrierPage';

const mockListJoursTemps = listJoursTemps as unknown as ReturnType<typeof vi.fn>;

const SAMPLE: JourTemps[] = [
  {
    id: '1',
    date: '2026-05-01',
    annee: 2026,
    trimestre: 2,
    mois: 5,
    jour: 1,
    semaineIso: 18,
    jourOuvre: false,
    estFinDeMois: false,
    estFinDeTrimestre: false,
    estFinDAnnee: false,
    exerciceFiscal: 2026,
    libelleMois: 'Mai 2026',
  },
  {
    id: '2',
    date: '2026-01-31',
    annee: 2026,
    trimestre: 1,
    mois: 1,
    jour: 31,
    semaineIso: 5,
    jourOuvre: false,
    estFinDeMois: true,
    estFinDeTrimestre: false,
    estFinDAnnee: false,
    exerciceFiscal: 2026,
    libelleMois: 'Janv. 2026',
  },
];

describe('CalendrierPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('mounts and renders the days returned by listJoursTemps', async () => {
    mockListJoursTemps.mockResolvedValue({
      items: SAMPLE,
      total: 2,
      page: 1,
      limit: 366,
    });

    render(<CalendrierPage />);

    await waitFor(() => {
      expect(screen.getByText('01/05/2026')).toBeInTheDocument();
    });
    // 1er mai férié — badge rouge "Férié/Week-end"
    expect(screen.getAllByText('Férié/Week-end').length).toBeGreaterThan(0);
    // 31/01/2026 affiche le badge "Fin mois" même si samedi (sémantique calendaire)
    expect(screen.getByText('Fin mois')).toBeInTheDocument();
  });

  it('falls back to a toast on API error', async () => {
    mockListJoursTemps.mockRejectedValue(new Error('boom'));

    render(<CalendrierPage />);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Impossible de charger le calendrier',
      );
    });
  });
});
