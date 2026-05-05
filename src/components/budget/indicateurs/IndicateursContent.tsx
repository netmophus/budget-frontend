/**
 * IndicateursContent (Lot 3.6) — corps réutilisable du tableau de
 * bord indicateurs (3 onglets) partagé entre le slide-over de la
 * grille de saisie (`IndicateursPanel`) et la page pleine
 * `TableauDeBordPage`.
 *
 * Onglets (Q15-Q17) :
 *   1. Vue d'ensemble  — 3 cartes KPI globales (PNB / MNI / Coef)
 *   2. Par CR          — drill-down 1 ligne par CR (Q16)
 *   3. Comparaison     — pivot par scénario (Q17)
 *
 * Le rafraîchissement de la vue matérialisée est exposé via un
 * bouton « Recalculer » qui appelle POST /refresh puis refetch les
 * 3 endpoints. La sémantique côté UI : valeurs au moment du dernier
 * REFRESH, pas en temps réel — un badge `derniereMaj` rappelle la
 * date du dernier rafraîchissement.
 */
import { AxiosError } from 'axios';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  classerCoefExploitation,
  getIndicateursComparaison,
  getIndicateursGlobaux,
  getIndicateursParCr,
  refreshIndicateurs,
  type IndicateursComparaison,
  type IndicateursGlobaux,
  type IndicateursParCr,
} from '@/lib/api/indicateurs';

const FORMATTER_FR = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const FORMATTER_PCT = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatNombre(n: number): string {
  return FORMATTER_FR.format(n);
}
function formatPct(v: number | null): string {
  return v === null ? '—' : `${FORMATTER_PCT.format(v)} %`;
}
function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR');
  } catch {
    return iso;
  }
}

function parseError(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    const msg = Array.isArray(data?.message)
      ? data!.message.join(' ; ')
      : (data?.message ?? err.message);
    return msg;
  }
  return err instanceof Error ? err.message : 'Erreur';
}

type Onglet = 'global' | 'par-cr' | 'comparaison';

export interface IndicateursContentProps {
  versionId: string;
  scenarioId: string;
  exerciceFiscal: number;
}

export function IndicateursContent({
  versionId,
  scenarioId,
  exerciceFiscal,
}: IndicateursContentProps): JSX.Element {
  const [onglet, setOnglet] = useState<Onglet>('global');
  const [globaux, setGlobaux] = useState<IndicateursGlobaux | null>(null);
  const [parCr, setParCr] = useState<IndicateursParCr[]>([]);
  const [comparaison, setComparaison] =
    useState<IndicateursComparaison | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErreur(null);
    try {
      const [g, c, comp] = await Promise.all([
        getIndicateursGlobaux({ versionId, scenarioId, exerciceFiscal }),
        getIndicateursParCr({ versionId, scenarioId, exerciceFiscal }),
        getIndicateursComparaison({ versionId, exerciceFiscal }),
      ]);
      setGlobaux(g);
      setParCr(c);
      setComparaison(comp);
    } catch (err) {
      setErreur(parseError(err));
    } finally {
      setLoading(false);
    }
  }, [versionId, scenarioId, exerciceFiscal]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  async function handleRefresh(): Promise<void> {
    setRefreshing(true);
    try {
      const r = await refreshIndicateurs();
      toast.success(
        `Indicateurs recalculés en ${r.dureeMs} ms (${r.nbLignes} ligne${r.nbLignes > 1 ? 's' : ''}).`,
      );
      await fetchAll();
    } catch (err) {
      toast.error(`Refresh impossible : ${parseError(err)}`);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Barre d'onglets + refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--border)">
        <div role="tablist" className="flex">
          {(
            [
              { key: 'global', label: 'Vue d’ensemble' },
              { key: 'par-cr', label: 'Par CR' },
              { key: 'comparaison', label: 'Comparaison scénarios' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={onglet === t.key}
              onClick={() => setOnglet(t.key)}
              className={`px-4 py-2 text-sm border-b-2 transition-colors ${
                onglet === t.key
                  ? 'border-(--primary) text-(--foreground) font-semibold'
                  : 'border-transparent text-(--muted-foreground) hover:text-(--foreground)'
              }`}
              data-testid={`tab-${t.key}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-2">
          <span className="text-xs text-(--muted-foreground)">
            Dernière maj :{' '}
            <span className="font-mono">{formatDate(globaux?.derniereMaj ?? null)}</span>
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            data-testid="btn-refresh-indicateurs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`}
            />
            {refreshing ? 'Recalcul…' : 'Recalculer'}
          </Button>
        </div>
      </div>

      {erreur && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 p-3 text-sm"
        >
          ⚠ {erreur}
        </div>
      )}
      {loading && (
        <div
          className="rounded-md border border-(--border) p-6 text-center text-sm text-(--muted-foreground)"
          data-testid="indicateurs-loading"
        >
          Chargement des indicateurs…
        </div>
      )}

      {!loading && !erreur && (
        <>
          {onglet === 'global' && globaux && (
            <OngletGlobal globaux={globaux} />
          )}
          {onglet === 'par-cr' && (
            <OngletParCr lignes={parCr} />
          )}
          {onglet === 'comparaison' && comparaison && (
            <OngletComparaison data={comparaison} />
          )}
        </>
      )}
    </div>
  );
}

// ─── Onglet 1 : Vue d'ensemble ───────────────────────────────────────

function OngletGlobal({
  globaux,
}: {
  globaux: IndicateursGlobaux;
}): JSX.Element {
  return (
    <div className="space-y-3" data-testid="onglet-global">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard
          label="PNB"
          value={formatNombre(globaux.pnb)}
          tone="success"
          note="Produit Net Bancaire (cl.7 − 67xxx)"
        />
        <KpiCard
          label="MNI"
          value={formatNombre(globaux.mni)}
          tone="info"
          note="Marge Nette d'Intérêt (76xxx − 67xxx)"
        />
        <KpiCardCoef value={globaux.coefExploitation} />
      </div>
      <div className="rounded-md border border-(--border) bg-(--muted)/30 p-3 text-xs space-y-1">
        <p className="font-semibold mb-1">Détail des sous-totaux</p>
        <div className="grid grid-cols-2 gap-1">
          <span>Total produits (classe 7) :</span>
          <span className="text-right font-mono">
            {formatNombre(globaux.totalProduits)}
          </span>
          <span>Total charges (classe 6) :</span>
          <span className="text-right font-mono">
            {formatNombre(globaux.totalCharges)}
          </span>
          <span>Charges hors intérêts :</span>
          <span className="text-right font-mono">
            {formatNombre(globaux.chargesHorsInterets)}
          </span>
          <span>CR inclus dans le calcul :</span>
          <span className="text-right font-mono">{globaux.nbCrInclus}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Onglet 2 : Par CR ───────────────────────────────────────────────

function OngletParCr({
  lignes,
}: {
  lignes: IndicateursParCr[];
}): JSX.Element {
  if (lignes.length === 0) {
    return (
      <div
        className="rounded-md border border-dashed border-(--border) p-6 text-center text-sm text-(--muted-foreground)"
        data-testid="par-cr-empty"
      >
        Aucun CR avec des données pour ce contexte.
      </div>
    );
  }
  // Tri par PNB DESC pour mettre en évidence les contributeurs.
  const sorted = [...lignes].sort((a, b) => b.pnb - a.pnb);
  return (
    <div className="overflow-x-auto" data-testid="onglet-par-cr">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-(--border) text-xs text-(--muted-foreground)">
            <th className="text-left py-2 pr-3">CR</th>
            <th className="text-right py-2 px-3">PNB</th>
            <th className="text-right py-2 px-3">MNI</th>
            <th className="text-right py-2 px-3">Charges hors int.</th>
            <th className="text-right py-2 px-3">Coef. expl.</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => {
            const classe = classerCoefExploitation(c.coefExploitation);
            const coefCls =
              classe === 'alerte'
                ? 'text-red-600 dark:text-red-400 font-semibold'
                : classe === 'attention'
                  ? 'text-orange-600 dark:text-orange-400'
                  : classe === 'sain'
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-(--muted-foreground)';
            return (
              <tr
                key={c.crId}
                className="border-b border-(--border)"
                data-testid={`par-cr-row-${c.codeCr}`}
              >
                <td className="py-2 pr-3">
                  <span className="font-mono font-bold">{c.codeCr}</span>
                  <span className="ml-2 text-(--muted-foreground)">
                    {c.libelleCr}
                  </span>
                </td>
                <td className="py-2 px-3 text-right font-mono">
                  {formatNombre(c.pnb)}
                </td>
                <td className="py-2 px-3 text-right font-mono">
                  {formatNombre(c.mni)}
                </td>
                <td className="py-2 px-3 text-right font-mono">
                  {formatNombre(c.chargesHorsInterets)}
                </td>
                <td
                  className={`py-2 px-3 text-right font-mono ${coefCls}`}
                  data-testid={`coef-${c.codeCr}`}
                >
                  {formatPct(c.coefExploitation)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-(--muted-foreground)">
        🟢 Coef &lt; {70}% sain — 🟠 70–100% attention — 🔴 &gt; 100% alerte
      </p>
    </div>
  );
}

// ─── Onglet 3 : Comparaison scénarios ────────────────────────────────

function OngletComparaison({
  data,
}: {
  data: IndicateursComparaison;
}): JSX.Element {
  if (data.scenarios.length === 0) {
    return (
      <div
        className="rounded-md border border-dashed border-(--border) p-6 text-center text-sm text-(--muted-foreground)"
        data-testid="comparaison-empty"
      >
        Aucun scénario avec des données pour cette version.
      </div>
    );
  }
  // Référence : le scénario `central` (Médian) si présent — sinon
  // le premier de la liste.
  const ref =
    data.scenarios.find((s) => s.typeScenario === 'central') ??
    data.scenarios[0]!;

  function ecart(courant: number, reference: number): string {
    if (reference === 0) return '—';
    const pct = ((courant - reference) / Math.abs(reference)) * 100;
    const signe = pct > 0 ? '+' : '';
    return `${signe}${FORMATTER_PCT.format(pct)} %`;
  }

  return (
    <div className="overflow-x-auto" data-testid="onglet-comparaison">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-(--border) text-xs text-(--muted-foreground)">
            <th className="text-left py-2 pr-3">Indicateur</th>
            {data.scenarios.map((s) => (
              <th
                key={s.scenarioId}
                className="text-right py-2 px-3"
                data-testid={`col-scenario-${s.codeScenario}`}
              >
                <div className="font-semibold">{s.codeScenario}</div>
                <div className="text-[10px] uppercase opacity-70">
                  {s.typeScenario}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(
            [
              { key: 'pnb', libelle: 'PNB' },
              { key: 'mni', libelle: 'MNI' },
              { key: 'totalProduits', libelle: 'Total produits' },
              { key: 'totalCharges', libelle: 'Total charges' },
              { key: 'chargesHorsInterets', libelle: 'Charges hors intérêts' },
            ] as const
          ).map((row) => (
            <tr
              key={row.key}
              className="border-b border-(--border)"
              data-testid={`row-${row.key}`}
            >
              <td className="py-2 pr-3 font-medium">{row.libelle}</td>
              {data.scenarios.map((s) => (
                <td
                  key={s.scenarioId}
                  className="py-2 px-3 text-right font-mono"
                >
                  {formatNombre(s[row.key])}
                  {s.scenarioId !== ref.scenarioId && row.key === 'pnb' && (
                    <span className="ml-2 text-xs text-(--muted-foreground)">
                      ({ecart(s.pnb, ref.pnb)})
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
          {/* Coef d'exploitation (cellule colorée par seuil) */}
          <tr className="border-b border-(--border)" data-testid="row-coef">
            <td className="py-2 pr-3 font-medium">Coef. d'exploitation</td>
            {data.scenarios.map((s) => {
              const classe = classerCoefExploitation(s.coefExploitation);
              const cls =
                classe === 'alerte'
                  ? 'text-red-600 dark:text-red-400 font-semibold'
                  : classe === 'attention'
                    ? 'text-orange-600 dark:text-orange-400'
                    : classe === 'sain'
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-(--muted-foreground)';
              return (
                <td
                  key={s.scenarioId}
                  className={`py-2 px-3 text-right font-mono ${cls}`}
                  data-testid={`coef-${s.codeScenario}`}
                >
                  {formatPct(s.coefExploitation)}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-xs text-(--muted-foreground)">
        Référence : <strong>{ref.codeScenario}</strong> ({ref.typeScenario}).
        Écarts en % vs cette référence (sur le PNB).
      </p>
    </div>
  );
}

// ─── KPI cards ───────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: string;
  tone: 'success' | 'info';
  note: string;
}): JSX.Element {
  const cls =
    tone === 'success'
      ? 'border-green-300 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
      : 'border-blue-300 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400';
  return (
    <div
      className={`rounded-md border p-3 text-center ${cls}`}
      data-testid={`kpi-${label}`}
    >
      <div className="text-xs uppercase tracking-wide font-semibold">
        {label}
      </div>
      <div className="text-xl font-bold font-mono mt-1">{value}</div>
      <div className="text-[10px] mt-1 opacity-80">{note}</div>
    </div>
  );
}

function KpiCardCoef({
  value,
}: {
  value: number | null;
}): JSX.Element {
  const classe = classerCoefExploitation(value);
  const cls =
    classe === 'alerte'
      ? 'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
      : classe === 'attention'
        ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400'
        : classe === 'sain'
          ? 'border-green-300 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
          : 'border-(--border) text-(--muted-foreground)';
  return (
    <div
      className={`rounded-md border p-3 text-center ${cls}`}
      data-testid="kpi-coef"
    >
      <div className="text-xs uppercase tracking-wide font-semibold">
        Coef. exploitation
      </div>
      <div className="text-xl font-bold font-mono mt-1">{formatPct(value)}</div>
      <div className="text-[10px] mt-1 opacity-80">
        {classe === 'alerte'
          ? '⚠ supérieur à 100% — non viable'
          : classe === 'attention'
            ? 'À surveiller (cible < 70%)'
            : classe === 'sain'
              ? 'Sain (cible BCEAO atteinte)'
              : 'PNB ≤ 0 — coef non calculable'}
      </div>
    </div>
  );
}
