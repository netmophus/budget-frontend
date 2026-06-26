/**
 * EcartsBarChartDimension (PR2) — bar chart Budget vs Réalisé groupé,
 * agrégé par une dimension (CR ou ligne métier). Barres horizontales
 * (top N par écart absolu). Clic sur une barre → drill-down (`onSelect`).
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { COULEUR_BUDGET, COULEUR_REALISE } from '@/lib/colors/niveaux-alerte';
import type { PointDimension } from './EcartsBarChartDimension.utils';

interface Props {
  titre: string;
  sousTitre: string;
  data: PointDimension[];
  testid: string;
  /** Appelé au clic sur une barre — alimente le drill-down. */
  onSelect: (cle: string) => void;
}

function formatFcfa(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function formatFcfaCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)} Mds`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(0)} M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)} K`;
  return String(Math.round(n));
}

interface TooltipPayloadItem {
  payload?: PointDimension;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="bg-white border border-(--border) rounded-md p-2 shadow-sm text-xs">
      <div className="font-semibold mb-1">{p.label}</div>
      <div className="tabular-nums">
        Budget : {formatFcfa(p.budget)} FCFA
      </div>
      <div className="tabular-nums">
        Réalisé : {formatFcfa(p.realise)} FCFA
      </div>
      <div className="tabular-nums text-(--muted-foreground)">
        Exécution :{' '}
        {p.tauxExecution === null ? '—' : `${p.tauxExecution.toFixed(0)} %`}
      </div>
    </div>
  );
}

export function EcartsBarChartDimension({
  titre,
  sousTitre,
  data,
  testid,
  onSelect,
}: Props): JSX.Element {
  const height = Math.max(160, data.length * 44 + 40);
  return (
    <div
      className="bg-white border border-(--border) rounded-md p-4"
      data-testid={testid}
    >
      <div className="mb-2">
        <h4 className="text-sm font-semibold m-0">{titre}</h4>
        <p className="text-[11px] text-(--muted-foreground) mt-0.5">
          {sousTitre} — cliquez une barre pour filtrer le tableau
        </p>
      </div>

      {data.length === 0 ? (
        <div
          className="h-[160px] flex items-center justify-center text-xs text-(--muted-foreground)"
          data-testid={`${testid}-vide`}
        >
          Aucune ligne à représenter.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 8, bottom: 4 }}
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickFormatter={formatFcfaCompact}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 11 }}
              width={140}
              interval={0}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#0000000A' }} />
            <Bar
              dataKey="budget"
              name="Budget"
              fill={COULEUR_BUDGET}
              radius={[0, 3, 3, 0]}
              cursor="pointer"
              onClick={(d) => onSelect((d as unknown as PointDimension).cle)}
            />
            <Bar
              dataKey="realise"
              name="Réalisé"
              fill={COULEUR_REALISE}
              radius={[0, 3, 3, 0]}
              cursor="pointer"
              onClick={(d) => onSelect((d as unknown as PointDimension).cle)}
            />
          </BarChart>
        </ResponsiveContainer>
      )}

      <div className="flex flex-wrap gap-4 mt-2 text-[11px] text-(--muted-foreground)">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: COULEUR_BUDGET }}
            aria-hidden="true"
          />
          Budget
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: COULEUR_REALISE }}
            aria-hidden="true"
          />
          Réalisé
        </span>
      </div>
    </div>
  );
}
