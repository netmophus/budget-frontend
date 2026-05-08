/**
 * Page détail reforecast (Lot 5.3.B) — /reforecast/:id.
 *
 * Header + onglets « Grille » et « Comparaison ». L'édition pleine
 * de la grille est laissée à la page existante /budget/saisie (Lot
 * 3.4) — un bouton de redirection est présent dans l'onglet Grille
 * quand le reforecast est en BROUILLON.
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ReforecastComparaisonOnglet } from '@/components/reforecast/ReforecastComparaisonOnglet';
import { ReforecastGrille } from '@/components/reforecast/ReforecastGrille';
import { ReforecastHeader } from '@/components/reforecast/ReforecastHeader';
import { Tabs } from '@/components/ui/tabs';
import {
  type Reforecast,
  getReforecast,
} from '@/lib/api/reforecast';

export function ReforecastDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [reforecast, setReforecast] = useState<Reforecast | null>(null);
  const [remplacant, setRemplacant] = useState<Reforecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(
    async (rfId: string) => {
      setLoading(true);
      setError(null);
      try {
        const r = await getReforecast(rfId);
        setReforecast(r);
        if (r.fkVersionRemplacante) {
          try {
            const rep = await getReforecast(r.fkVersionRemplacante);
            setRemplacant(rep);
          } catch {
            setRemplacant(null);
          }
        } else {
          setRemplacant(null);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur';
        setError(msg);
        toast.error(`Chargement reforecast : ${msg}`);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (id) void fetch(id);
  }, [id, fetch]);

  if (loading) {
    return (
      <p
        className="text-sm text-(--muted-foreground)"
        data-testid="rf-detail-loading"
      >
        Chargement…
      </p>
    );
  }

  if (error || !reforecast) {
    return (
      <div
        className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        data-testid="rf-detail-error"
      >
        {error ?? 'Reforecast introuvable.'}
      </div>
    );
  }

  return (
    <div data-testid="rf-detail-page">
      <ReforecastHeader
        reforecast={reforecast}
        remplacant={remplacant}
        onTransitioned={() => void fetch(reforecast.id)}
      />
      <Tabs
        tabs={[
          {
            value: 'grille',
            label: 'Grille',
            content: <ReforecastGrille reforecast={reforecast} />,
          },
          {
            value: 'comparaison',
            label: 'Comparaison vs source',
            content: (
              <ReforecastComparaisonOnglet
                reforecastId={reforecast.id}
                trimestreConsolide={reforecast.trimestreConsolide}
              />
            ),
          },
        ]}
        defaultValue="grille"
      />
    </div>
  );
}
