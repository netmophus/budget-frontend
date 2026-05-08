/**
 * Tests Vitest client API tableau-bord (Lot 5.2-fix1) — vérifient
 * la sérialisation des paramètres array `crIds` / `ligneMetierIds`
 * en format « repeat » (`crIds=14&crIds=15`) et non `brackets`
 * (`crIds[]=14`).
 *
 * Le bug initial : `whitelist + forbidNonWhitelisted` côté backend
 * rejetait `crIds[]` comme propriété inconnue → 400 sur Aïcha.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from './client';
import {
  analyserEcarts,
  exporterEcartsExcel,
  type FiltresEcarts,
} from './tableau-bord';

const filtresAvecArrays: FiltresEcarts = {
  versionId: 'v1',
  scenarioId: 's1',
  crIds: ['14', '15'],
  ligneMetierIds: ['101', '102'],
  moisDebut: '2027-01',
  moisFin: '2027-03',
  seuilEcartPctAttention: 5,
  seuilEcartPctCritique: 10,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('analyserEcarts — sérialisation query string', () => {
  it("passe paramsSerializer { indexes: null } à apiClient.get", async () => {
    const spy = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({
        data: { filtres: filtresAvecArrays, kpi: {}, lignes: [] },
      } as never);

    await analyserEcarts(filtresAvecArrays);

    expect(spy).toHaveBeenCalledTimes(1);
    const config = spy.mock.calls[0]![1] as {
      paramsSerializer?: { indexes: null | false };
    };
    expect(config.paramsSerializer).toEqual({ indexes: null });
  });

  it("produit crIds=14&crIds=15 (pas crIds[]) sur l'URL finale", async () => {
    const spy = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({
        data: { filtres: filtresAvecArrays, kpi: {}, lignes: [] },
      } as never);

    await analyserEcarts(filtresAvecArrays);

    const [url, config] = spy.mock.calls[0]!;
    // Reconstruit l'URL complète comme axios le ferait
    const finalUrl = apiClient.getUri({
      url: url as string,
      params: (config as { params: unknown }).params,
      paramsSerializer: (
        config as { paramsSerializer: { indexes: null } }
      ).paramsSerializer,
    });

    expect(finalUrl).toContain('crIds=14');
    expect(finalUrl).toContain('crIds=15');
    expect(finalUrl).toContain('ligneMetierIds=101');
    expect(finalUrl).toContain('ligneMetierIds=102');
    // Format « brackets » interdit (encodé ou non)
    expect(finalUrl).not.toContain('crIds[]');
    expect(finalUrl).not.toContain('crIds%5B%5D');
    expect(finalUrl).not.toContain('ligneMetierIds[]');
  });

  it('sérialise correctement quand crIds est absent (pas de erreur)', async () => {
    const spy = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({
        data: { filtres: filtresAvecArrays, kpi: {}, lignes: [] },
      } as never);

    await analyserEcarts({
      versionId: 'v1',
      scenarioId: 's1',
      moisDebut: '2027-01',
      moisFin: '2027-03',
      seuilEcartPctAttention: 5,
      seuilEcartPctCritique: 10,
    });

    const [url, config] = spy.mock.calls[0]!;
    const finalUrl = apiClient.getUri({
      url: url as string,
      params: (config as { params: unknown }).params,
      paramsSerializer: (
        config as { paramsSerializer: { indexes: null } }
      ).paramsSerializer,
    });
    expect(finalUrl).toContain('versionId=v1');
    expect(finalUrl).not.toContain('crIds');
  });
});

describe('exporterEcartsExcel — sérialisation query string', () => {
  it('partage le même paramsSerializer que analyserEcarts', async () => {
    const blob = new Blob(['fake'], { type: 'application/octet-stream' });
    const spy = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ data: blob, headers: {} } as never);

    // Stub DOM pour éviter l'effet de bord du download (jsdom)
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:fake');
    URL.revokeObjectURL = vi.fn();

    try {
      await exporterEcartsExcel(filtresAvecArrays);

      const config = spy.mock.calls[0]![1] as {
        paramsSerializer?: { indexes: null | false };
        responseType?: string;
      };
      expect(config.paramsSerializer).toEqual({ indexes: null });
      expect(config.responseType).toBe('blob');

      const [url] = spy.mock.calls[0]!;
      const finalUrl = apiClient.getUri({
        url: url as string,
        params: (config as unknown as { params: unknown }).params,
        paramsSerializer: config.paramsSerializer,
      });
      expect(finalUrl).toContain('crIds=14');
      expect(finalUrl).not.toContain('crIds[]');
    } finally {
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
    }
  });
});
