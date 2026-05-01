import { renderHook, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/configuration', () => ({
  listRefSecondaires: vi.fn(),
}));

import {
  listRefSecondaires,
  type RefSecondaire,
} from '@/lib/api/configuration';
import {
  __resetRefSecondaireCache,
  useRefSecondaireOptions,
} from './useRefSecondaireOptions';

const mockList = listRefSecondaires as unknown as ReturnType<typeof vi.fn>;

function buildItem(
  partial: Partial<RefSecondaire> & Pick<RefSecondaire, 'code' | 'libelle'>,
): RefSecondaire {
  return {
    id: '1',
    description: null,
    ordre: 0,
    estActif: true,
    estSysteme: false,
    dateCreation: '2026-01-01T00:00:00Z',
    utilisateurCreation: 'system',
    dateModification: null,
    utilisateurModification: null,
    ...partial,
  };
}

describe('useRefSecondaireOptions', () => {
  beforeEach(() => {
    __resetRefSecondaireCache();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('charge les options au mount (loading puis options triées)', async () => {
    mockList.mockResolvedValue({
      items: [
        buildItem({ code: 'b', libelle: 'B', ordre: 20 }),
        buildItem({ code: 'a', libelle: 'A', ordre: 10 }),
      ],
      total: 2,
      page: 1,
      limit: 200,
    });

    const { result } = renderHook(() =>
      useRefSecondaireOptions('type-structure'),
    );

    expect(result.current.loading).toBe(true);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    // Tri par ordre ASC : a (10), b (20)
    expect(result.current.options).toEqual([
      { value: 'a', libelle: 'A', estSysteme: false },
      { value: 'b', libelle: 'B', estSysteme: false },
    ]);
  });

  it('appelle listRefSecondaires avec estActif=true et limit=200', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 200 });

    renderHook(() => useRefSecondaireOptions('pays'));

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith('pays', {
        estActif: true,
        limit: 200,
      });
    });
  });

  it('cache : 2 hooks consécutifs sur même refKey → 1 seul fetch', async () => {
    mockList.mockResolvedValue({
      items: [buildItem({ code: 'a', libelle: 'A' })],
      total: 1,
      page: 1,
      limit: 200,
    });

    const { unmount } = renderHook(() =>
      useRefSecondaireOptions('type-structure'),
    );
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(1);
    });
    unmount();

    // Re-render → doit puiser dans le cache (pas de 2e appel API)
    const { result: result2 } = renderHook(() =>
      useRefSecondaireOptions('type-structure'),
    );
    await waitFor(() => {
      expect(result2.current.loading).toBe(false);
    });
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(result2.current.options).toHaveLength(1);
  });

  it('refresh() force un re-fetch (bypass cache)', async () => {
    mockList.mockResolvedValue({
      items: [buildItem({ code: 'a', libelle: 'A' })],
      total: 1,
      page: 1,
      limit: 200,
    });

    const { result } = renderHook(() =>
      useRefSecondaireOptions('type-structure'),
    );
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(mockList).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refresh();
    });
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('erreur API : error renseigné, loading=false', async () => {
    mockList.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() =>
      useRefSecondaireOptions('type-structure'),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.options).toEqual([]);
  });

  it('filtre est_actif=true côté UI (double sécurité)', async () => {
    // Backend renvoie une valeur inactive par erreur — le hook
    // l'efface côté UI.
    mockList.mockResolvedValue({
      items: [
        buildItem({ code: 'a', libelle: 'A', estActif: true }),
        buildItem({ code: 'b', libelle: 'B', estActif: false }),
      ],
      total: 2,
      page: 1,
      limit: 200,
    });

    const { result } = renderHook(() =>
      useRefSecondaireOptions('type-structure'),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.options).toHaveLength(1);
    expect(result.current.options[0]!.value).toBe('a');
  });

  it('refKey différents → 2 fetchs distincts', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, limit: 200 });

    renderHook(() => useRefSecondaireOptions('type-structure'));
    renderHook(() => useRefSecondaireOptions('pays'));

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(2);
    });
    const calls = mockList.mock.calls.map((c) => c[0] as string);
    expect(calls.sort()).toEqual(['pays', 'type-structure']);
  });

  it('estSysteme remonté dans l\'option (utile pour styling)', async () => {
    mockList.mockResolvedValue({
      items: [buildItem({ code: 'a', libelle: 'A', estSysteme: true })],
      total: 1,
      page: 1,
      limit: 200,
    });

    const { result } = renderHook(() =>
      useRefSecondaireOptions('type-structure'),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.options[0]!.estSysteme).toBe(true);
  });
});
