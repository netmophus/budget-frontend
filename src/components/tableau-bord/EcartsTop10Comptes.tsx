/**
 * EcartsTop10Comptes (Lot 8.5.C) — barres horizontales des 10 lignes
 * avec le plus gros écart absolu, colorées par niveau d'alerte.
 *
 * Reçoit `lignes: LigneEcart[]` post-filtres rapides (niveau +
 * recherche). Filtre les `ecartAbs === null` (lignes sans réalisé →
 * MANQUANT, non rankable), trie décroissant, slice 10.
 *
 * Label Y = "code_compte libelle_compte tronqué (libelleMois)" pour
 * distinguer les lignes du même compte sur plusieurs mois.
 */
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { LIBELLES_NIVEAU } from '@/lib/colors/niveaux-alerte';
import type { LigneEcart } from '@/lib/api/tableau-bord';
import {
  selectionnerTopParSens,
  truncate,
  type PointTop,
} from './EcartsTop10Comptes.utils';

interface Props {
  lignes: LigneEcart[];
  /** N de barres affichées (défaut 10). */
  limit?: number;
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
  payload?: PointTop;
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
    <div className="bg-white border border-(--border) rounded-md p-2 shadow-sm text-xs max-w-[280px]">
      <div className="font-semibold mb-0.5">
        {p.codeCompte} {truncate(p.libelleCompte, 32)}
      </div>
      <div className="text-(--muted-foreground)">{p.libelleMois}</div>
      <div className="flex items-center gap-1.5 mt-1 tabular-nums">
        <span
          className="inline-block w-2.5 h-2.5 rounded-sm"
          style={{ backgroundColor: p.fill }}
          aria-hidden="true"
        />
        <span>
          {LIBELLES_NIVEAU[p.niveau]} — {formatFcfa(p.ecartAbs)} FCFA
        </span>
      </div>
      {p.sensEcart && (
        <div className="text-(--muted-foreground) mt-0.5">
          Sens : {p.sensEcart.toLowerCase()}
        </div>
      )}
    </div>
  );
}

function TopChart({
  titre,
  sousTitre,
  data,
  testid,
}: {
  titre: string;
  sousTitre: string;
  data: PointTop[];
  testid: string;
}): JSX.Element {
  // Hauteur dynamique : ~36px par barre + ~30px padding axes (min 120px).
  const height = Math.max(120, data.length * 36 + 30);
  return (
    <div
      className="bg-white border border-(--border) rounded-md p-4"
      data-testid={testid}
    >
      <div className="mb-2">
        <h4 className="text-sm font-semibold m-0">{titre}</h4>
        <p className="text-[11px] text-(--muted-foreground) mt-0.5">
          {sousTitre}
        </p>
      </div>
      {data.length === 0 ? (
        <div
          className="h-[120px] flex items-center justify-center text-xs text-(--muted-foreground)"
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
          >
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickFormatter={formatFcfaCompact}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 11 }}
              width={220}
              interval={0}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="ecartAbs" name="Écart absolu" radius={[0, 3, 3, 0]}>
              {data.map((p, i) => (
                <Cell key={`${p.codeCompte}-${i}`} fill={p.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function EcartsTop10Comptes({
  lignes,
  limit = 10,
}: Props): JSX.Element {
  const surPerf = useMemo(
    () => selectionnerTopParSens(lignes, limit, 'FAVORABLE'),
    [lignes, limit],
  );
  const sousPerf = useMemo(
    () => selectionnerTopParSens(lignes, limit, 'DEFAVORABLE'),
    [lignes, limit],
  );

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      data-testid="graph-top10-comptes"
    >
      <TopChart
        titre={`Top ${limit} sur-performances`}
        sousTitre="Écarts favorables (produits en hausse / charges en baisse)"
        data={surPerf}
        testid="graph-top10-sur"
      />
      <TopChart
        titre={`Top ${limit} sous-performances`}
        sousTitre="Écarts défavorables (produits en baisse / charges en hausse)"
        data={sousPerf}
        testid="graph-top10-sous"
      />
    </div>
  );
}
