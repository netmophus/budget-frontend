/**
 * EcartsDonutNiveaux (Lot 8.5.C) — donut % par niveau d'alerte.
 *
 * IMPORTANT : ce composant reçoit `lignes` filtrées par la RECHERCHE
 * uniquement (compte/CR), PAS par le filtre niveau. Si on appliquait
 * le filtre niveau, le donut deviendrait mono-couleur et perdrait son
 * sens (cf. décision actée brief 8.5.C).
 *
 * 4 segments : CRITIQUE / ATTENTION / NORMAL / MANQUANT. Compte
 * dérivé du tableau complet (pas du `kpi.nbEcartsTotal` backend qui
 * exclut les lignes NORMAL — cf. analyse-ecarts.service.ts:295-308).
 */
import { useMemo } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import type { LigneEcart } from '@/lib/api/tableau-bord';
import {
  compterParNiveau,
  type PointNiveau,
} from './EcartsDonutNiveaux.utils';

interface Props {
  lignes: LigneEcart[];
}

interface TooltipPayloadItem {
  payload?: PointNiveau;
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
      <div className="font-semibold flex items-center gap-1.5">
        <span
          className="inline-block w-2.5 h-2.5 rounded-sm"
          style={{ backgroundColor: p.fill }}
          aria-hidden="true"
        />
        {p.libelle}
      </div>
      <div className="tabular-nums text-(--muted-foreground)">
        {p.count} ligne(s) — {p.pct.toFixed(1)}%
      </div>
    </div>
  );
}

export function EcartsDonutNiveaux({ lignes }: Props): JSX.Element {
  const data = useMemo(() => compterParNiveau(lignes), [lignes]);
  const total = lignes.length;

  return (
    <div
      className="bg-white border border-(--border) rounded-md p-4"
      data-testid="graph-donut-niveaux"
    >
      <div className="mb-2">
        <h4 className="text-sm font-semibold m-0">
          Répartition par niveau d&apos;alerte
        </h4>
        <p className="text-[11px] text-(--muted-foreground) mt-0.5">
          Ignore le filtre &laquo; niveau &raquo; — applique uniquement la
          recherche
        </p>
      </div>

      {total === 0 ? (
        <div
          className="h-[260px] flex items-center justify-center text-xs text-(--muted-foreground)"
          data-testid="graph-donut-vide"
        >
          Aucune ligne à représenter.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2 items-center">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="niveau"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={1}
                stroke="#FFFFFF"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {data.map((p) => (
                  <Cell key={p.niveau} fill={p.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Légende custom en colonne (4 lignes + total) */}
          <div
            className="flex flex-col gap-1.5 text-[11px]"
            data-testid="graph-donut-legende"
          >
            {data.map((p) => (
              <div
                key={p.niveau}
                className="flex items-center justify-between gap-2"
              >
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: p.fill }}
                    aria-hidden="true"
                  />
                  <span>{p.libelle}</span>
                </span>
                <span className="tabular-nums text-(--muted-foreground)">
                  {p.count} ({p.pct.toFixed(1)}%)
                </span>
              </div>
            ))}
            <div className="border-t border-(--border) mt-1 pt-1 flex items-center justify-between text-(--muted-foreground)">
              <span>Total</span>
              <span className="tabular-nums font-medium">{total}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
