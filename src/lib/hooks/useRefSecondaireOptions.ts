/**
 * Hook React pour charger les options actives d'un référentiel
 * secondaire (énumération centralisée — Lot 2.5-bis-A backend).
 *
 * Charge `est_actif=true` côté API ET filtre côté UI (double
 * sécurité, en cas de réponse cachée stale ou d'inversion). Tri
 * par `ordre` ASC puis `libelle` ASC.
 *
 * Cache simple en mémoire (TTL 60s) pour éviter le N+1 entre 2
 * ouvertures successives du même drawer dans la même page. Le
 * cache est partagé par `refKey` au niveau module.
 *
 * Usage :
 * ```typescript
 * const { options, loading, error, refresh } =
 *   useRefSecondaireOptions('type-structure');
 * ```
 *
 * Limitations connues :
 *  - Limit 200 : suffisant pour 99 % des cas (le PCB UMOA fait
 *    ~150 lignes max ; les autres ref restent < 50). Au-delà,
 *    paginer côté caller.
 *  - Pas de propagation cross-onglets : ouvrir /configuration dans
 *    un autre onglet ne rafraîchit pas le cache de cet onglet.
 *    L'utilisateur peut appeler `refresh()` manuellement, ou le
 *    cache expire au bout de 60s.
 *  - Pas de lib externe (react-query, swr) — contrainte
 *    "aucune nouvelle dépendance".
 */
import { useEffect, useRef, useState } from 'react';

import {
  listRefSecondaires,
  type RefKey,
  type RefSecondaire,
} from '@/lib/api/configuration';

export interface RefSecondaireOption {
  value: string;
  libelle: string;
  estSysteme: boolean;
}

export interface UseRefSecondaireOptionsResult {
  options: RefSecondaireOption[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

interface CacheEntry {
  data: RefSecondaire[];
  timestamp: number;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<RefKey, CacheEntry>();

function isExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp > CACHE_TTL_MS;
}

function toOptions(data: RefSecondaire[]): RefSecondaireOption[] {
  // Double sécurité : on filtre est_actif=true côté UI au cas où
  // le cache contiendrait un état stale.
  return data
    .filter((d) => d.estActif)
    .slice()
    .sort((a, b) => {
      if (a.ordre !== b.ordre) return a.ordre - b.ordre;
      return a.libelle.localeCompare(b.libelle);
    })
    .map((d) => ({
      value: d.code,
      libelle: d.libelle,
      estSysteme: d.estSysteme,
    }));
}

/**
 * Vide le cache de tous les référentiels — utile pour les tests
 * unitaires qui veulent isoler chaque cas. Pas exposé en prod.
 */
export function __resetRefSecondaireCache(): void {
  cache.clear();
}

export function useRefSecondaireOptions(
  refKey: RefKey,
): UseRefSecondaireOptionsResult {
  const [data, setData] = useState<RefSecondaire[]>(() => {
    const cached = cache.get(refKey);
    return cached && !isExpired(cached) ? cached.data : [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    const cached = cache.get(refKey);
    return !cached || isExpired(cached);
  });
  const [error, setError] = useState<Error | null>(null);
  // Évite les setState après unmount (React 19 strict mode double-mount).
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function fetchData(bypassCache: boolean): Promise<void> {
    if (!bypassCache) {
      const cached = cache.get(refKey);
      if (cached && !isExpired(cached)) {
        if (mountedRef.current) {
          setData(cached.data);
          setLoading(false);
          setError(null);
        }
        return;
      }
    }
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await listRefSecondaires(refKey, {
        estActif: true,
        limit: 200,
      });
      cache.set(refKey, { data: res.items, timestamp: Date.now() });
      if (mountedRef.current) {
        setData(res.items);
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void fetchData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refKey]);

  async function refresh(): Promise<void> {
    cache.delete(refKey);
    await fetchData(true);
  }

  return {
    options: toOptions(data),
    loading,
    error,
    refresh,
  };
}
