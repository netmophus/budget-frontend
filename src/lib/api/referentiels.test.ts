import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { items: [], total: 0, page: 1, limit: 50 } }),
  },
}));

import { apiClient } from './client';
import {
  getDevisePivot,
  getJourByDate,
  listDevises,
  listJoursTemps,
} from './referentiels';

const mockedGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;

describe('referentiels API', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('listJoursTemps GETs /referentiels/temps with params', async () => {
    await listJoursTemps({ annee: 2026, mois: 5, page: 1, limit: 366 });
    expect(mockedGet).toHaveBeenCalledWith('/referentiels/temps', {
      params: { annee: 2026, mois: 5, page: 1, limit: 366 },
    });
  });

  it('getJourByDate GETs /referentiels/temps/par-date/:date', async () => {
    mockedGet.mockResolvedValueOnce({ data: { id: '1', date: '2026-05-01' } });
    await getJourByDate('2026-05-01');
    expect(mockedGet).toHaveBeenCalledWith(
      '/referentiels/temps/par-date/2026-05-01',
    );
  });

  it('listDevises GETs /referentiels/devises with the estActive filter', async () => {
    await listDevises({ estActive: true, codeIso: 'XO', page: 1, limit: 100 });
    expect(mockedGet).toHaveBeenCalledWith('/referentiels/devises', {
      params: { estActive: true, codeIso: 'XO', page: 1, limit: 100 },
    });
  });

  it('getDevisePivot GETs /referentiels/devises/pivot', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { id: '1', codeIso: 'XOF', estDevisePivot: true },
    });
    const result = await getDevisePivot();
    expect(mockedGet).toHaveBeenCalledWith('/referentiels/devises/pivot');
    expect(result.codeIso).toBe('XOF');
  });
});
