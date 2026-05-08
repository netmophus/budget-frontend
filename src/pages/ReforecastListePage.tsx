/**
 * Page liste reforecasts (Lot 5.3.B) — /reforecast.
 */
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { LancerReforecastDialog } from '@/components/reforecast/LancerReforecastDialog';
import { ReforecastListeFiltres } from '@/components/reforecast/ReforecastListeFiltres';
import { ReforecastListeTable } from '@/components/reforecast/ReforecastListeTable';
import { Button } from '@/components/ui/button';
import { useHasPermission } from '@/lib/auth/permissions';
import {
  filtrerListe,
  useReforecastStore,
} from '@/lib/stores/reforecast-store';

export function ReforecastListePage(): JSX.Element {
  const { liste, loading, error, recherche, fetchListe } =
    useReforecastStore();
  const canLancer = useHasPermission('BUDGET.REFORECAST_LANCER');
  const [dialogOuvert, setDialogOuvert] = useState(false);

  useEffect(() => {
    void fetchListe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const listeFiltree = useMemo(
    () => filtrerListe(liste, recherche),
    [liste, recherche],
  );

  // Map id_remplaçant ← liste : permet le tooltip "Remplacé par"
  const remplacantParId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const rf of liste) {
      if (rf.fkVersionRemplacante) {
        const remp = liste.find((x) => x.id === rf.fkVersionRemplacante);
        if (remp) map[rf.id] = remp.codeVersion;
      }
    }
    return map;
  }, [liste]);

  return (
    <div>
      <PageHeader
        title="Reforecasts trimestriels"
        description="Reprévision périodique du budget après consolidation d'un trimestre. Le réalisé validé du trimestre est repris ; les trimestres restants sont extrapolés."
        actions={
          canLancer ? (
            <Button
              onClick={() => setDialogOuvert(true)}
              data-testid="rf-btn-lancer"
            >
              <Plus className="mr-2 h-4 w-4" />
              Lancer un reforecast
            </Button>
          ) : undefined
        }
      />

      <ReforecastListeFiltres />

      {loading && (
        <p className="text-sm text-(--muted-foreground)">Chargement…</p>
      )}

      {error && !loading && (
        <div
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-3"
          data-testid="rf-error-state"
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {liste.length === 0 ? (
            <p
              className="text-sm text-(--muted-foreground)"
              data-testid="rf-liste-empty-global"
            >
              {canLancer
                ? "Aucun reforecast existant. Cliquez sur « Lancer un reforecast » pour commencer."
                : 'Aucun reforecast à afficher.'}
            </p>
          ) : (
            <ReforecastListeTable
              liste={listeFiltree}
              remplacantParId={remplacantParId}
            />
          )}
        </>
      )}

      <LancerReforecastDialog
        isOpen={dialogOuvert}
        onClose={() => setDialogOuvert(false)}
      />
    </div>
  );
}
