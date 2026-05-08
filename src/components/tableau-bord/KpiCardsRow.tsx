/**
 * KpiCardsRow (Lot 5.2.C) — 4 cards horizontales avec les KPI
 * principaux du tableau de bord.
 */
import { type KpiEcarts } from '@/lib/api/tableau-bord';

interface Props {
  kpi: KpiEcarts;
}

function formatMontant(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function KpiCardsRow({ kpi }: Props): JSX.Element {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4"
      data-testid="kpi-cards"
    >
      <div className="rounded-md border border-(--border) bg-(--background) p-4">
        <div
          className="text-3xl font-bold tabular-nums"
          data-testid="kpi-total"
        >
          {kpi.nbEcartsTotal}
        </div>
        <div className="text-xs text-(--muted-foreground) mt-1">
          lignes avec écart
        </div>
      </div>

      <div className="rounded-md border border-red-200 bg-red-50 p-4">
        <div
          className="text-3xl font-bold tabular-nums text-red-700"
          data-testid="kpi-critique"
        >
          {kpi.nbEcartsCritique}
        </div>
        <div className="text-xs text-red-700 mt-1">
          écarts ≥ seuil critique
        </div>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
        <div
          className="text-3xl font-bold tabular-nums text-amber-700"
          data-testid="kpi-attention"
        >
          {kpi.nbEcartsAttention}
        </div>
        <div className="text-xs text-amber-700 mt-1">
          écarts ≥ seuil attention
        </div>
      </div>

      <div className="rounded-md border border-(--border) bg-(--background) p-4">
        <div
          className="text-3xl font-bold tabular-nums"
          data-testid="kpi-total-abs"
        >
          {formatMontant(kpi.ecartTotalAbs)}
        </div>
        <div className="text-xs text-(--muted-foreground) mt-1">
          écart total absolu (FCFA)
        </div>
        <div className="text-xs text-(--muted-foreground) mt-2">
          défavorable :{' '}
          <span className="text-red-700 tabular-nums">
            {formatMontant(kpi.ecartTotalDefavorable)}
          </span>
          {' · '}
          favorable :{' '}
          <span className="text-green-700 tabular-nums">
            {formatMontant(kpi.ecartTotalFavorable)}
          </span>
        </div>
      </div>
    </div>
  );
}
