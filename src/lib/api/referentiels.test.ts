import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { items: [], total: 0, page: 1, limit: 50 } }),
  },
}));

import { apiClient } from './client';
import {
  getCrByCode,
  getCrsByStructure,
  getDevisePivot,
  getJourByDate,
  getStructureByCode,
  getStructureRacines,
  listCrs,
  listDevises,
  listJoursTemps,
  listStructures,
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

  // ─── Structures (2.3A)

  it('listStructures GETs /referentiels/structures with filters', async () => {
    await listStructures({
      codePays: 'CIV',
      typeStructure: 'agence',
      search: 'plat',
      page: 1,
      limit: 100,
    });
    expect(mockedGet).toHaveBeenCalledWith('/referentiels/structures', {
      params: {
        codePays: 'CIV',
        typeStructure: 'agence',
        search: 'plat',
        page: 1,
        limit: 100,
      },
    });
  });

  it('getStructureByCode GETs /referentiels/structures/par-code/:code', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { id: '1', codeStructure: 'AG_X' },
    });
    await getStructureByCode('AG_X');
    expect(mockedGet).toHaveBeenCalledWith(
      '/referentiels/structures/par-code/AG_X',
    );
  });

  it('getStructureRacines GETs /referentiels/structures/racines', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    await getStructureRacines();
    expect(mockedGet).toHaveBeenCalledWith('/referentiels/structures/racines');
  });

  // ─── Centres de responsabilité (2.3B)

  it('listCrs GETs /referentiels/cr with filters', async () => {
    await listCrs({
      codeStructure: 'DIR_RETAIL',
      typeCr: 'cdp',
      page: 1,
      limit: 50,
    });
    expect(mockedGet).toHaveBeenCalledWith('/referentiels/cr', {
      params: {
        codeStructure: 'DIR_RETAIL',
        typeCr: 'cdp',
        page: 1,
        limit: 50,
      },
    });
  });

  it('getCrByCode GETs /referentiels/cr/par-code/:code', async () => {
    mockedGet.mockResolvedValueOnce({ data: { id: '1', codeCr: 'CR_X' } });
    await getCrByCode('CR_X');
    expect(mockedGet).toHaveBeenCalledWith('/referentiels/cr/par-code/CR_X');
  });

  it('getCrsByStructure GETs /referentiels/cr/par-structure/:codeStructure', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] });
    await getCrsByStructure('DIR_RETAIL');
    expect(mockedGet).toHaveBeenCalledWith(
      '/referentiels/cr/par-structure/DIR_RETAIL',
    );
  });
});
