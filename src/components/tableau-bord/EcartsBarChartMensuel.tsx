/**
 * EcartsBarChartMensuel (Lot 8.5.C) — bar chart Budget vs Réalisé
 * agrégé par mois. Lit `lignes: LigneEcart[]` post-filtres rapides
 * (niveau + recherche), agrège côté composant via useMemo.
 *
 * Format de barres : 2 séries par mois (Budget bleu nuit, Réalisé
 * violet catégorie REALISE). Tri chronologique sur la clé YYYY-MM
 * (pas sur le libellé qui n'est pas trimable).
 *
 * Cas vide géré : 0 ligne → message d'état au lieu d'un chart vide.
 */
import { useMemo } from 'react';
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
import type { LigneEcart } from '@/lib/api/tableau-bord';
import { aggregerParMois } from './EcartsBarChartMensuel.utils';

interface Props {
  lignes: LigneEcart[];
}

function formatFcfa(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function formatFcfaCompact(n: number): string {
  // Axe Y : abrégé pour rester lisible (1.2 Mds, 350 M, 12 K)
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)} Mds`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(0)} M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)} K`;
  return String(Math.round(n));
}

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-(--border) rounded-md p-2 shadow-sm text-xs">
      <div className="font-semibold mb-1">{label ?? ''}</div>
      {payload.map((p) => (
        <div
          key={p.dataKey ?? p.name}
          className="flex items-center gap-2 tabular-nums"
        >
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: p.color }}
            aria-hidden="true"
          />
          <span>{p.name} :</span>
          <span className="font-medium">
            {formatFcfa(Number(p.value ?? 0))} FCFA
          </span>
        </div>
      ))}
    </div>
  );
}

export function EcartsBarChartMensuel({ lignes }: Props): JSX.Element {
  const data = useMemo(() => aggregerParMois(lignes), [lignes]);

  return (
    <div
      className="bg-white border border-(--border) rounded-md p-4"
      data-testid="graph-barres-mensuelles"
    >
      <div className="mb-2">
        <h4 className="text-sm font-semibold m-0">
          Budget vs Réalisé par mois
        </h4>
        <p className="text-[11px] text-(--muted-foreground) mt-0.5">
          Agrégation FCFA sur le périmètre filtré
        </p>
      </div>

      {data.length === 0 ? (
        <div
          className="h-[260px] flex items-center justify-center text-xs text-(--muted-foreground)"
          data-testid="graph-barres-vide"
        >
          Aucune ligne à représenter.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="libelleMois"
              tick={{ fontSize: 11 }}
              tickMargin={6}
            />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatFcfaCompact} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="budget"
              name="Budget"
              fill={COULEUR_BUDGET}
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="realise"
              name="Réalisé"
              fill={COULEUR_REALISE}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Légende custom (carrés colorés, plus lisible que la légende
          Recharts par défaut qui prend trop de place vertical) */}
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
