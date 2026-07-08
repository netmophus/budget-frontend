import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { RefSecondaireTable } from '@/components/configuration/RefSecondaireTable';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';
import { listRefSecondaires, type RefKey } from '@/lib/api/configuration';
import {
  categorieIcon,
  REF_CATEGORIES,
  REF_KEYS_ORDERED,
  refMeta,
  refsByCategory,
} from '@/lib/labels/configuration';

const DEFAULT_REF: RefKey = 'type-structure';

function isRefKey(value: string | null): value is RefKey {
  if (!value) return false;
  return (REF_KEYS_ORDERED as readonly string[]).includes(value);
}

export function ConfigurationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const refFromUrl = searchParams.get('ref');
  const initialRef = isRefKey(refFromUrl) ? refFromUrl : DEFAULT_REF;
  const [activeRef, setActiveRef] = useState<RefKey>(initialRef);
  const [counts, setCounts] = useState<Partial<Record<RefKey, number>>>({});
  const [countsLoading, setCountsLoading] = useState(true);
  const [countsRefreshKey, setCountsRefreshKey] = useState(0);

  // Synchronise l'URL quand on change d'onglet (sans push history).
  useEffect(() => {
    if (activeRef !== refFromUrl) {
      setSearchParams({ ref: activeRef }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRef]);

  // Re-synchronise le state quand l'URL change (navigation back/forward).
  useEffect(() => {
    if (refFromUrl && isRefKey(refFromUrl) && refFromUrl !== activeRef) {
      setActiveRef(refFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refFromUrl]);

  // Charge le count des valeurs actives pour chaque référentiel.
  // 13 requêtes parallèles (limit=1 pour économiser de la bande
  // passante — on ne lit que `total`).
  useEffect(() => {
    setCountsLoading(true);
    Promise.all(
      REF_KEYS_ORDERED.map((key) =>
        listRefSecondaires(key, { limit: 1, estActif: true }).then(
          (r) => [key, r.total] as const,
        ),
      ),
    )
      .then((entries) => {
        const map: Partial<Record<RefKey, number>> = {};
        for (const [key, count] of entries) map[key] = count;
        setCounts(map);
      })
      .catch(() =>
        toast.error('Impossible de charger les compteurs de référentiels.'),
      )
      .finally(() => setCountsLoading(false));
  }, [countsRefreshKey]);

  const grouped = useMemo(() => refsByCategory(), []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nomenclatures"
        description="Types, statuts et catégories utilisés par les référentiels (énumérations métier centralisées). Chaque modification est journalisée dans l'audit log."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panneau gauche — navigation catégorisée (25%) */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="rounded-md border border-(--border) bg-(--background) p-3 space-y-4 lg:sticky lg:top-4">
            {REF_CATEGORIES.map((cat) => {
              const items = grouped[cat.key];
              if (items.length === 0) return null;
              const CatIcon = categorieIcon(cat.key);
              return (
                <div key={cat.key} className="space-y-1">
                  {/* En-tête de catégorie (gros menu) */}
                  <div className="flex items-center gap-2.5 px-1 pt-1">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-(--secondary) text-(--foreground)">
                      <CatIcon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm font-semibold text-(--foreground)">
                      {cat.label}
                    </span>
                  </div>
                  {/* Sous-items indentés avec filet vertical (arborescence) */}
                  <div className="ml-3 space-y-0.5 border-l border-(--border) pl-2">
                    {items.map((m) => {
                      const Icon = m.icon;
                      const isActive = m.refKey === activeRef;
                      const count = counts[m.refKey];
                      return (
                        <button
                          key={m.refKey}
                          type="button"
                          onClick={() => setActiveRef(m.refKey)}
                          className={cn(
                            'relative flex w-full items-center justify-between gap-2 rounded-md py-2 pl-4 pr-3 text-sm text-left transition-colors',
                            isActive
                              ? 'bg-(--accent) font-medium text-(--accent-foreground)'
                              : 'text-(--muted-foreground) hover:bg-(--accent)/50 hover:text-(--foreground)',
                          )}
                        >
                          {isActive && (
                            <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-(--primary)" />
                          )}
                          <span className="flex items-center gap-2 min-w-0">
                            <Icon
                              className={cn(
                                'h-4 w-4 shrink-0',
                                isActive && 'text-(--primary)',
                              )}
                            />
                            <span className="truncate">{m.label}</span>
                          </span>
                          {!countsLoading && count !== undefined && (
                            <span
                              className={cn(
                                'text-xs rounded-full px-2 py-0.5 shrink-0',
                                isActive
                                  ? 'bg-(--background) text-(--foreground)'
                                  : 'bg-(--secondary) text-(--secondary-foreground)',
                              )}
                            >
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Panneau droit — référentiel sélectionné (75%) */}
        <section className="lg:col-span-3">
          <div className="rounded-md border border-(--border) bg-(--background) p-4 space-y-4">
            <RefSecondaireTable
              key={activeRef /* re-mount sur changement de ref */}
              refKey={activeRef}
              onMutate={() => setCountsRefreshKey((k) => k + 1)}
            />
          </div>
        </section>
      </div>

      {/* Helper : charge la meta pour le titre de page (utilisable
          plus tard si on veut un breadcrumb). */}
      <span className="hidden">{refMeta(activeRef).labelSingular}</span>
    </div>
  );
}
