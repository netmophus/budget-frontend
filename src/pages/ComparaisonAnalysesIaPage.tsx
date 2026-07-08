/**
 * ComparaisonAnalysesIaPage (Chantier C3) — compare 2 analyses IA côte à
 * côte (ex. janvier vs février) : sélecteurs, synthèse comparative des KPIs
 * (évolution + coloration amélioration/dégradation), markdown en parallèle.
 *
 * Route : /execution/comparaison-analyses-ia?a=ID1&b=ID2  (gate AI.ANALYSER).
 * 100 % frontend : 2 GET /analyses-ia/:id (dataset figé C-fix + kpi_snapshot).
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

import { PageHeader } from '@/components/common/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatMontant } from '@/lib/labels/budget';
import {
  getAnalyseIaDetail,
  listerAnalysesIa,
  type AnalyseIaDetail,
  type AnalyseIaListItem,
} from '@/lib/api/analyseIa';

interface KpiDef {
  key: string;
  label: string;
  betterWhenLower: boolean;
  montant?: boolean;
  percent?: boolean;
}

/** KPIs comparables (présents dans kpi_snapshot = ecarts.kpi). */
const KPI_DEFS: KpiDef[] = [
  { key: 'nbEcartsCritique', label: 'Écarts CRITIQUE', betterWhenLower: true },
  { key: 'nbEcartsAttention', label: 'Écarts ATTENTION', betterWhenLower: true },
  { key: 'nbSansBudget', label: 'Sans budget', betterWhenLower: true },
  { key: 'nbLignesManquantes', label: 'Lignes manquantes', betterWhenLower: true },
  { key: 'ecartTotalAbs', label: 'Écart total absolu', betterWhenLower: true, montant: true },
  { key: 'ecartTotalDefavorable', label: 'Écart défavorable', betterWhenLower: true, montant: true },
  { key: 'ecartTotalFavorable', label: 'Écart favorable', betterWhenLower: false, montant: true },
];

/**
 * C3 add-on — métriques bancaires (top-level du détail, issues du dataset figé).
 * PNB : hausse = amélioration. Coef exploitation : baisse = amélioration
 * (cible <= 65 %).
 */
type MetriqueField =
  | 'pnbBudget'
  | 'pnbRealise'
  | 'coefExploitationRealise';

const METRIQUE_DEFS: Array<KpiDef & { field: MetriqueField }> = [
  { field: 'pnbBudget', key: 'pnbBudget', label: 'PNB Budget', betterWhenLower: false, montant: true },
  { field: 'pnbRealise', key: 'pnbRealise', label: 'PNB Réalisé', betterWhenLower: false, montant: true },
  { field: 'coefExploitationRealise', key: 'coefExploitationRealise', label: 'Coef. exploitation Réalisé', betterWhenLower: true, percent: true },
];

function num(snap: Record<string, unknown> | null, key: string): number | null {
  const v = snap?.[key];
  return typeof v === 'number' ? v : null;
}

export function ComparaisonAnalysesIaPage() {
  const [params, setParams] = useSearchParams();
  const idA = params.get('a') ?? '';
  const idB = params.get('b') ?? '';

  const [options, setOptions] = useState<AnalyseIaListItem[]>([]);
  const [a, setA] = useState<AnalyseIaDetail | null>(null);
  const [b, setB] = useState<AnalyseIaDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // Options des sélecteurs (100 dernières analyses accessibles).
  useEffect(() => {
    listerAnalysesIa({ page: 1, limit: 100 })
      .then((r) => setOptions(r.items))
      .catch(() => toast.error("Impossible de charger la liste des analyses."));
  }, []);

  // Chargement des 2 analyses quand a/b changent.
  useEffect(() => {
    setLoading(true);
    Promise.all([
      idA ? getAnalyseIaDetail(idA) : Promise.resolve(null),
      idB ? getAnalyseIaDetail(idB) : Promise.resolve(null),
    ])
      .then(([da, db]) => {
        setA(da);
        setB(db);
      })
      .catch(() => toast.error("Impossible de charger une analyse."))
      .finally(() => setLoading(false));
  }, [idA, idB]);

  const setId = (slot: 'a' | 'b', id: string): void => {
    const next = new URLSearchParams(params);
    if (id) next.set(slot, id);
    else next.delete(slot);
    setParams(next);
  };

  const perimetresDifferents = useMemo(
    () =>
      a !== null &&
      b !== null &&
      (a.versionId !== b.versionId || a.scenarioId !== b.scenarioId),
    [a, b],
  );

  const kpisComparables = a?.kpiSnapshot != null && b?.kpiSnapshot != null;

  return (
    <div className="space-y-4" data-testid="comparaison-analyses-ia-page">
      <PageHeader
        title="Comparaison d'analyses MIZNAS AI"
        description="Suivez l'évolution d'un mois à l'autre : KPIs et recommandations côte à côte."
      />

      {/* Sélecteurs */}
      <div className="flex flex-wrap gap-4">
        <SelecteurAnalyse label="Analyse A" value={idA} options={options} onChange={(id) => setId('a', id)} />
        <SelecteurAnalyse label="Analyse B" value={idB} options={options} onChange={(id) => setId('b', id)} />
      </div>

      {perimetresDifferents && (
        <div
          className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          data-testid="avertissement-perimetres"
        >
          <AlertTriangle className="h-4 w-4" />
          Comparaison entre périmètres différents (version ou scénario distincts) — à interpréter avec prudence.
        </div>
      )}

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : !a || !b ? (
        <p className="text-sm text-(--muted-foreground)">
          Sélectionnez deux analyses à comparer.
        </p>
      ) : (
        <>
          {/* Synthèse comparative des KPIs */}
          {kpisComparables ? (
            <div className="overflow-x-auto rounded-md border border-(--border)" data-testid="kpi-comparatif">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-(--border) text-left">
                    <th className="p-2">Indicateur</th>
                    <th className="p-2 text-right">A</th>
                    <th className="p-2 text-right">B</th>
                    <th className="p-2 text-right">Évolution</th>
                  </tr>
                </thead>
                <tbody>
                  {KPI_DEFS.map((def) => (
                    <LigneKpi
                      key={def.key}
                      def={def}
                      valA={num(a.kpiSnapshot, def.key)}
                      valB={num(b.kpiSnapshot, def.key)}
                    />
                  ))}
                  {/* C3 add-on — métriques bancaires (PNB, coef exploitation). */}
                  {METRIQUE_DEFS.map((def) => (
                    <LigneKpi
                      key={def.key}
                      def={def}
                      valA={a[def.field]}
                      valB={b[def.field]}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-(--muted-foreground)" data-testid="kpi-absent">
              Synthèse comparative indisponible (kpi_snapshot manquant sur une
              analyse) — comparaison des textes uniquement.
            </p>
          )}

          {/* Markdown côte à côte */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ColonneAnalyse titre="Analyse A" detail={a} />
            <ColonneAnalyse titre="Analyse B" detail={b} />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────

function SelecteurAnalyse({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: AnalyseIaListItem[];
  onChange: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-(--muted-foreground)">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-80" data-testid={`select-${label}`}>
          <SelectValue placeholder="Choisir une analyse…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.moisDebut} → {o.moisFin} · {formatDate(o.dateGeneration)} ({o.versionId}/{o.scenarioId})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function LigneKpi({
  def,
  valA,
  valB,
}: {
  def: KpiDef;
  valA: number | null;
  valB: number | null;
}) {
  const fmt = (v: number | null): string => {
    if (v === null) return '—';
    if (def.montant) return `${formatMontant(v)} FCFA`;
    if (def.percent) return `${v.toFixed(1)} %`;
    return String(v);
  };

  let couleur = 'text-(--muted-foreground)';
  let fleche = <ArrowRight className="h-3.5 w-3.5" />;
  let delta = '—';
  if (valA !== null && valB !== null) {
    const diff = valB - valA;
    if (diff !== 0) {
      const amelioration = def.betterWhenLower ? diff < 0 : diff > 0;
      couleur = amelioration ? 'text-green-600' : 'text-red-600';
      fleche = diff < 0 ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />;
      if (def.percent) {
        delta = `${diff > 0 ? '+' : ''}${diff.toFixed(1)} pts`;
      } else {
        const pct = valA !== 0 ? ` (${((diff / Math.abs(valA)) * 100).toFixed(0)} %)` : '';
        delta = `${diff > 0 ? '+' : ''}${def.montant ? formatMontant(diff) : String(diff)}${pct}`;
      }
    } else {
      delta = '=';
    }
  }

  return (
    <tr className="border-b border-(--border) last:border-0" data-testid={`kpi-${def.key}`}>
      <td className="p-2">{def.label}</td>
      <td className="p-2 text-right">{fmt(valA)}</td>
      <td className="p-2 text-right">{fmt(valB)}</td>
      <td className={`p-2 text-right ${couleur}`}>
        <span className="inline-flex items-center justify-end gap-1">
          {fleche}
          {delta}
        </span>
      </td>
    </tr>
  );
}

function ColonneAnalyse({ titre, detail }: { titre: string; detail: AnalyseIaDetail }) {
  return (
    <div className="rounded-md border border-(--border)">
      <div className="border-b border-(--border) bg-(--secondary)/40 p-3 text-sm">
        <div className="font-semibold">{titre}</div>
        <div className="text-xs text-(--muted-foreground)">
          {detail.moisDebut} → {detail.moisFin} · généré le {formatDate(detail.dateGeneration)} · {detail.modele}
        </div>
      </div>
      <div className="prose prose-sm max-w-none p-3" data-testid={`markdown-${titre}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {detail.reponseMarkdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
