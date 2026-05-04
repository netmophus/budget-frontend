/**
 * VersionsAValiderPage (Lot 3.5) — file d'attente du contrôleur.
 *
 * Liste les versions au statut 'soumis' (« Soumis » en UI). Pour
 * chacune : code, type, exercice, date de soumission, préparateur,
 * commentaire de soumission, et boutons Valider / Rejeter via le
 * composant WorkflowActions.
 *
 * Permission requise : BUDGET.VALIDER (cf. AppRoutes.tsx).
 */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { WorkflowActions } from '@/components/budget/WorkflowActions';
import { WorkflowTimeline } from '@/components/budget/WorkflowTimeline';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { listVersions, type Version } from '@/lib/api/versions';
import {
  badgeClassTypeVersion,
  formatDateFr,
  libelleTypeVersion,
} from '@/lib/labels/budget';

export function VersionsAValiderPage() {
  const [items, setItems] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    listVersions({ statut: 'soumis', page: 1, limit: 100 })
      .then((res) => setItems(res.items))
      .catch(() => toast.error('Impossible de charger la file de validation.'))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Versions à valider"
        description="File d'attente des versions soumises par les préparateurs. Validez ou rejetez avec commentaire."
      />

      {loading && (
        <div className="rounded-md border border-(--border) p-8 text-center text-sm text-(--muted-foreground)">
          Chargement…
        </div>
      )}

      {!loading && items.length === 0 && (
        <div
          className="rounded-md border border-dashed border-(--border) p-8 text-center text-sm text-(--muted-foreground)"
          data-testid="empty-state"
        >
          Aucune version en attente de validation.
        </div>
      )}

      {!loading && items.length > 0 && (
        <ul className="space-y-3" data-testid="liste-a-valider">
          {items.map((v) => (
            <li
              key={v.id}
              className="rounded-md border border-(--border) bg-(--card) p-4"
              data-testid={`row-${v.codeVersion}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">{v.codeVersion}</span>
                    <Badge className={badgeClassTypeVersion(v.typeVersion)}>
                      {libelleTypeVersion(v.typeVersion)}
                    </Badge>
                    <span className="text-sm font-medium">{v.libelle}</span>
                  </div>
                  <p className="text-xs text-(--muted-foreground)">
                    Exercice {v.exerciceFiscal}
                    {v.dateSoumission && (
                      <>
                        {' · '}
                        Soumis le {formatDateFr(v.dateSoumission)}
                        {v.utilisateurSoumission && (
                          <> par {v.utilisateurSoumission}</>
                        )}
                      </>
                    )}
                  </p>
                  {v.commentaireSoumission && (
                    <p className="mt-2 max-w-3xl whitespace-pre-wrap rounded bg-(--muted) px-3 py-2 text-xs">
                      {v.commentaireSoumission}
                    </p>
                  )}
                </div>
                <WorkflowActions
                  version={v}
                  onTransitioned={() => setRefreshKey((k) => k + 1)}
                />
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-(--muted-foreground) hover:text-(--foreground)">
                  Historique
                </summary>
                <div className="mt-2">
                  <WorkflowTimeline version={v} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
