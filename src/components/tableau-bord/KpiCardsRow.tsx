/**
 * KpiCardsRow (Lot 5.2.C) — 4 cards horizontales avec les KPI
 * principaux du tableau de bord.
 *
 * État erreur (Lot 5-fix-ui) : affiche `—` au lieu de `0` quand
 * l'API a échoué — `0` était trompeur (pouvait suggérer "aucun
 * écart" alors que la requête n'avait pas abouti).
 */
import { type KpiEcarts } from '@/lib/api/tableau-bord';

interface Props {
  kpi: KpiEcarts;
  /** Si true, affiche "—" à la place des chiffres (état échec API). */
  erreur?: boolean;
}

function formatMontant(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function KpiCardsRow({ kpi, erreur }: Props): JSX.Element {
  const nbTotal = erreur ? '—' : String(kpi.nbEcartsTotal);
  const nbCritique = erreur ? '—' : String(kpi.nbEcartsCritique);
  const nbAttention = erreur ? '—' : String(kpi.nbEcartsAttention);
  const totalAbs = erreur ? '—' : formatMontant(kpi.ecartTotalAbs);
  const defav = erreur ? '—' : formatMontant(kpi.ecartTotalDefavorable);
  const fav = erreur ? '—' : formatMontant(kpi.ecartTotalFavorable);
  const fondNeutre = erreur ? 'bg-(--muted)/30' : '';
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4"
      data-testid="kpi-cards"
    >
      <div
        className={`rounded-md border border-(--border) bg-(--background) p-4 ${fondNeutre}`}
      >
        <div
          className="text-3xl font-bold tabular-nums"
          data-testid="kpi-total"
        >
          {nbTotal}
        </div>
        <div className="text-xs text-(--muted-foreground) mt-1">
          lignes avec écart
        </div>
      </div>

      <div
        className={`rounded-md border ${erreur ? 'border-(--border) bg-(--muted)/30' : 'border-red-200 bg-red-50'} p-4`}
      >
        <div
          className={`text-3xl font-bold tabular-nums ${erreur ? '' : 'text-red-700'}`}
          data-testid="kpi-critique"
        >
          {nbCritique}
        </div>
        <div className={`text-xs mt-1 ${erreur ? 'text-(--muted-foreground)' : 'text-red-700'}`}>
          écarts ≥ seuil critique
        </div>
      </div>

      <div
        className={`rounded-md border ${erreur ? 'border-(--border) bg-(--muted)/30' : 'border-amber-200 bg-amber-50'} p-4`}
      >
        <div
          className={`text-3xl font-bold tabular-nums ${erreur ? '' : 'text-amber-700'}`}
          data-testid="kpi-attention"
        >
          {nbAttention}
        </div>
        <div className={`text-xs mt-1 ${erreur ? 'text-(--muted-foreground)' : 'text-amber-700'}`}>
          écarts ≥ seuil attention
        </div>
      </div>

      <div
        className={`rounded-md border border-(--border) bg-(--background) p-4 ${fondNeutre}`}
      >
        <div
          className="text-3xl font-bold tabular-nums"
          data-testid="kpi-total-abs"
        >
          {totalAbs}
        </div>
        <div className="text-xs text-(--muted-foreground) mt-1">
          écart total absolu (FCFA)
        </div>
        <div className="text-xs text-(--muted-foreground) mt-2">
          défavorable :{' '}
          <span className={`tabular-nums ${erreur ? '' : 'text-red-700'}`}>
            {defav}
          </span>
          {' · '}
          favorable :{' '}
          <span className={`tabular-nums ${erreur ? '' : 'text-green-700'}`}>
            {fav}
          </span>
        </div>
      </div>
    </div>
  );
}
