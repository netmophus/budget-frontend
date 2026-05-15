/**
 * Page liste reforecasts (Lot 5.3.B + refonte Lot 7.3 V25 Charte
 * v1) — /reforecast.
 *
 * Refonte V25 :
 *  - Header custom : cercle RotateCw catégorie REALISE (violet
 *    #5B4E91) + titre + sous-titre + CTA "Lancer un reforecast"
 *    bleu nuit
 *  - 3 KPI workflow cards (Brouillons / Publiés / Année courante)
 *    avec pastille colorée
 *  - Filtres en cadre gris (refondu V25 dans ReforecastListeFiltres)
 *  - Tableau modernisé grid CSS (refondu V25 dans
 *    ReforecastListeTable)
 *  - Bandeau erreur Charte v1 (style alerte rouge épuré)
 *  - États vides grand format avec icônes
 *
 * Logique métier 100 % préservée : zustand store reforecast,
 * fetchListe, filtrerListe, permission BUDGET.REFORECAST_LANCER,
 * map remplacantParId pour tooltip OBSOLETE, LancerReforecastDialog
 * intacte (testée séparément).
 */
import { Plus, RotateCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { LancerReforecastDialog } from '@/components/reforecast/LancerReforecastDialog';
import { ReforecastListeFiltres } from '@/components/reforecast/ReforecastListeFiltres';
import { ReforecastListeTable } from '@/components/reforecast/ReforecastListeTable';
import { Button } from '@/components/ui/button';
import { useHasPermission } from '@/lib/auth/permissions';
import {
  filtrerListe,
  useReforecastStore,
} from '@/lib/stores/reforecast-store';

const CURRENT_YEAR = new Date().getFullYear();

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

  // 3 KPI workflow.
  const kpi = useMemo(() => {
    const brouillons = liste.filter((r) => r.statut === 'ouvert').length;
    const publies = liste.filter((r) => r.statut === 'gele').length;
    const anneeCourante = liste.filter(
      (r) => r.anneeConsolide === CURRENT_YEAR,
    ).length;
    return { brouillons, publies, anneeCourante };
  }, [liste]);

  return (
    <div>
      {/* ─── Header custom ──────────────────────────────────── */}
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            style={{ backgroundColor: '#5B4E911A' }}
            className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <RotateCw className="w-5 h-5" style={{ color: '#5B4E91' }} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[19px] font-semibold tracking-tight m-0">
              Reforecasts trimestriels
            </h3>
            <p className="text-xs text-(--muted-foreground) mt-0.5">
              Reprévision périodique — le réalisé du trimestre est repris,
              les trimestres restants extrapolés
            </p>
          </div>
        </div>

        {canLancer && (
          <Button
            onClick={() => setDialogOuvert(true)}
            data-testid="rf-btn-lancer"
            className="h-9 px-3.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Lancer un reforecast
          </Button>
        )}
      </div>

      {/* ─── 3 KPI workflow ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-5">
        <KpiQueueCard
          label="Brouillons"
          value={kpi.brouillons}
          colorHex="#5F6B7A"
          testId="kpi-rf-brouillons"
        />
        <KpiQueueCard
          label="Publiés"
          value={kpi.publies}
          colorHex="#0F6E56"
          testId="kpi-rf-publies"
        />
        <KpiQueueCard
          label={`Année ${CURRENT_YEAR}`}
          value={kpi.anneeCourante}
          colorHex="#5B4E91"
          testId="kpi-rf-annee-courante"
        />
      </div>

      <ReforecastListeFiltres />

      {loading && (
        <div className="bg-white border border-(--border) rounded-md p-6 text-center text-sm text-(--muted-foreground)">
          Chargement…
        </div>
      )}

      {error && !loading && (
        <div
          className="rounded-md border p-3 text-sm mb-3 flex items-start gap-2"
          style={{
            borderColor: '#DC262640',
            backgroundColor: '#DC26260D',
            color: '#DC2626',
          }}
          data-testid="rf-error-state"
        >
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          {liste.length === 0 ? (
            <div
              className="bg-white border border-dashed border-(--border) rounded-lg py-14 px-7 text-center"
              data-testid="rf-liste-empty-global"
            >
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3.5"
                style={{ backgroundColor: '#5B4E9114' }}
                aria-hidden="true"
              >
                <RotateCw className="w-7 h-7" style={{ color: '#5B4E91' }} />
              </div>
              <div className="text-[15px] font-semibold text-(--foreground) mb-1.5">
                {canLancer
                  ? 'Aucun reforecast pour le moment'
                  : 'Aucun reforecast à afficher'}
              </div>
              <p className="text-xs text-(--muted-foreground) max-w-[420px] mx-auto leading-relaxed">
                {canLancer
                  ? 'Cliquez sur « Lancer un reforecast » pour créer la première reprévision après consolidation d\'un trimestre.'
                  : 'Aucune reprévision n\'a encore été lancée pour votre périmètre.'}
              </p>
            </div>
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

// ─── KPI workflow card (cohérent V19/V21/V24) ─────────────────────

interface KpiQueueCardProps {
  label: string;
  value: number;
  colorHex: string;
  testId: string;
}

function KpiQueueCard({
  label,
  value,
  colorHex,
  testId,
}: KpiQueueCardProps): JSX.Element {
  return (
    <div
      className="bg-white border border-(--border) rounded-md p-3.5"
      data-testid={testId}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="w-[7px] h-[7px] rounded-full"
          style={{ backgroundColor: colorHex }}
          aria-hidden="true"
        />
        <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider">
          {label}
        </div>
      </div>
      <div
        className="text-2xl font-medium tabular-nums"
        style={{ color: colorHex }}
      >
        {value}
      </div>
    </div>
  );
}
