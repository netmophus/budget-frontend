/**
 * Tests Vitest resolve-fk-temps (Lot 5.1.B-fix1).
 *
 * Vérifient le bug fixé : `2027-03` doit être résolu en passant par
 * l'endpoint dédié `getJourByDate('2027-03-01')`, PAS par le listing
 * `/referentiels/temps?date=...&jour=1` qui se faisait stripper les
 * params en silence par `whitelist: true` du ValidationPipe backend.
 */
import { AxiosError } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/referentiels', () => ({
  getJourByDate: vi.fn(),
}));

import { getJourByDate } from '@/lib/api/referentiels';
import { resolveFkTemps } from './resolve-fk-temps';

const mockGet = getJourByDate as unknown as ReturnType<typeof vi.fn>;

describe('resolveFkTemps (Lot 5.1.B-fix1)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("résout '2027-03' via getJourByDate('2027-03-01') et retourne l'id", async () => {
    mockGet.mockResolvedValue({
      id: '2251',
      date: '2027-03-01',
      annee: 2027,
      mois: 3,
      jour: 1,
    });
    const id = await resolveFkTemps('2027-03');
    expect(id).toBe('2251');
    expect(mockGet).toHaveBeenCalledWith('2027-03-01');
  });

  it("utilise le cache local sans appel API si le mois y est déjà", async () => {
    const id = await resolveFkTemps('2027-03', {
      '2251': { mois: '2027-03' },
      '2252': { mois: '2027-04' },
    });
    expect(id).toBe('2251');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("retourne null pour un mois invalide '2027-13' sans appel API (validation locale)", async () => {
    const id = await resolveFkTemps('2027-13');
    expect(id).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("retourne null pour un mois invalide '2027-00' sans appel API", async () => {
    const id = await resolveFkTemps('2027-00');
    expect(id).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("retourne null pour une chaîne mal formée 'abc' sans appel API", async () => {
    const id = await resolveFkTemps('abc');
    expect(id).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("retourne null pour chaîne vide", async () => {
    const id = await resolveFkTemps('');
    expect(id).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("retourne null si l'endpoint répond 404 (mois absent de dim_temps)", async () => {
    const err = new AxiosError('Not Found');
    err.response = { status: 404, data: {} } as never;
    mockGet.mockRejectedValue(err);
    const id = await resolveFkTemps('2099-01');
    expect(id).toBeNull();
  });

  it("retourne null si l'endpoint répond 500 (sans crash UI)", async () => {
    const err = new AxiosError('Server error');
    err.response = { status: 500, data: {} } as never;
    mockGet.mockRejectedValue(err);
    const id = await resolveFkTemps('2027-04');
    expect(id).toBeNull();
  });
});
