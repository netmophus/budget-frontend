/**
 * IndicateursContent (Lot 3.6 + refonte Lot 7.3 V23 Charte v1).
 *
 * Corps réutilisable du tableau de bord indicateurs (3 onglets)
 * partagé entre le slide-over de la grille de saisie
 * (`IndicateursPanel`) et la page pleine `TableauDeBordPage`.
 *
 * Onglets (Q15-Q17) :
 *   1. Vue d'ensemble  — 3 cartes KPI HERO (PNB / MNI / Coef
 *      avec barre de progression dynamique) + Détail sous-totaux
 *   2. Par CR          — drill-down 1 ligne par CR (Q16)
 *   3. Comparaison     — pivot par scénario (Q17)
 *
 * Le rafraîchissement de la vue matérialisée est exposé via un
 * bouton « Recalculer » qui appelle POST /refresh puis refetch les
 * 3 endpoints.
 *
 * Refonte V23 :
 *  - Onglets underline ambre (cohérent V11→V22 et /mes-delegations)
 *  - KpiHeroCard PNB (vert) + MNI (bleu nuit) avec icône filigrane,
 *    valeur géante mono, label uppercase + sous-titre + formule
 *  - KpiCoefficientCard avec barre de progression colorée par
 *    seuil (sain ≤65 / vigilance ≤75 / alerte >75) + marqueur
 *    cible BCEAO
 *  - DetailSousTotauxCard table propre avec header gris
 *  - Onglets Par CR / Comparaison conservés tels quels (coloration
 *    coef toujours en classes red/orange/green pour préserver les
 *    tests `coef-...className.toMatch(/red/)`)
 *  - Tous les data-testid préservés
 */
import { AxiosError } from 'axios';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Coins,
  RefreshCw,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
    <div>
      {/* ─── Onglets underline ambre + Maj + Recalculer ────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--border) mb-5">
        <div role="tablist" className="flex gap-6">
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
              className={cn(
                'py-2.5 px-0.5 text-sm transition-colors',
                onglet === t.key
                  ? 'border-b-2 border-(--miznas-ambre) font-medium text-(--foreground) -mb-px'
                  : 'text-(--muted-foreground) hover:text-(--foreground)',
              )}
              data-testid={`tab-${t.key}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-2">
          <span className="text-[11px] text-(--muted-foreground) whitespace-nowrap">
            Maj.{' '}
            <span className="font-mono">
              {formatDate(globaux?.derniereMaj ?? null)}
            </span>
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            data-testid="btn-refresh-indicateurs"
            className="h-9 gap-1.5"
          >
            <RefreshCw
              className={cn(
                'w-3.5 h-3.5',
                refreshing && 'animate-spin',
              )}
            />
            {refreshing ? 'Recalcul…' : 'Recalculer'}
          </Button>
        </div>
      </div>

      {erreur && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 p-3 text-sm mb-4"
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
          {onglet === 'par-cr' && <OngletParCr lignes={parCr} />}
          {onglet === 'comparaison' && comparaison && (
            <OngletComparaison data={comparaison} />
          )}
        </>
      )}
    </div>
  );
}

// ─── Onglet 1 : Vue d'ensemble (V23 Charte v1) ─────────────────────

function OngletGlobal({
  globaux,
}: {
  globaux: IndicateursGlobaux;
}): JSX.Element {
  return (
    <div className="space-y-4" data-testid="onglet-global">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiHeroCard
          label="PNB"
          subtitle="Produit Net Bancaire"
          formula="cl.7 − 67xxx"
          value={globaux.pnb}
          tone="positive"
          Icon={TrendingUp}
          testId="kpi-PNB"
        />
        <KpiHeroCard
          label="MNI"
          subtitle="Marge Nette d'Intérêt"
          formula="76xxx − 67xxx"
          value={globaux.mni}
          tone="neutral"
          Icon={Coins}
          testId="kpi-MNI"
        />
        <KpiCoefficientCard
          coefficient={globaux.coefExploitation}
          cibleBCEAO={65}
        />
      </div>
      <DetailSousTotauxCard
        totalProduits={globaux.totalProduits}
        totalCharges={globaux.totalCharges}
        chargesHorsInterets={globaux.chargesHorsInterets}
        nbCR={globaux.nbCrInclus}
      />
    </div>
  );
}

// ─── Onglet 2 : Par CR (logique métier inchangée) ──────────────────

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
    <div
      className="bg-white border border-(--border) rounded-md overflow-x-auto"
      data-testid="onglet-par-cr"
    >
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-(--secondary) border-b border-(--border) text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            <th className="text-left py-3 px-4">CR</th>
            <th className="text-right py-3 px-4">PNB</th>
            <th className="text-right py-3 px-4">MNI</th>
            <th className="text-right py-3 px-4">Charges hors int.</th>
            <th className="text-right py-3 px-4">Coef. expl.</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => {
            const classe = classerCoefExploitation(c.coefExploitation);
            // Classes Tailwind preservées (tests vérifient /red/ /orange/ /green/).
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
                className="border-b border-(--border) last:border-b-0 hover:bg-(--muted)/30 transition-colors"
                data-testid={`par-cr-row-${c.codeCr}`}
              >
                <td className="py-3 px-4">
                  <span
                    className="font-mono font-bold text-[13px]"
                    style={{ color: '#0C447C' }}
                  >
                    {c.codeCr}
                  </span>
                  <span className="ml-2 text-(--muted-foreground)">
                    {c.libelleCr}
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  {formatNombre(c.pnb)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  {formatNombre(c.mni)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  {formatNombre(c.chargesHorsInterets)}
                </td>
                <td
                  className={`py-3 px-4 text-right font-mono tabular-nums ${coefCls}`}
                  data-testid={`coef-${c.codeCr}`}
                >
                  {formatPct(c.coefExploitation)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-4 py-2.5 border-t border-(--border) text-xs text-(--muted-foreground) bg-(--secondary)/40">
        🟢 Coef &lt; 70 % sain — 🟠 70-100 % attention — 🔴 &gt; 100 %
        alerte
      </p>
    </div>
  );
}

// ─── Onglet 3 : Comparaison scénarios (logique inchangée) ──────────

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
    <div
      className="bg-white border border-(--border) rounded-md overflow-x-auto"
      data-testid="onglet-comparaison"
    >
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-(--secondary) border-b border-(--border) text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
            <th className="text-left py-3 px-4">Indicateur</th>
            {data.scenarios.map((s) => (
              <th
                key={s.scenarioId}
                className="text-right py-3 px-4"
                data-testid={`col-scenario-${s.codeScenario}`}
              >
                <div className="font-semibold normal-case tracking-normal text-[13px] text-(--foreground)">
                  {s.codeScenario}
                </div>
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
              className="border-b border-(--border) hover:bg-(--muted)/30 transition-colors"
              data-testid={`row-${row.key}`}
            >
              <td className="py-3 px-4 font-medium">{row.libelle}</td>
              {data.scenarios.map((s) => (
                <td
                  key={s.scenarioId}
                  className="py-3 px-4 text-right font-mono tabular-nums"
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
          <tr
            className="border-b border-(--border) hover:bg-(--muted)/30 transition-colors"
            data-testid="row-coef"
          >
            <td className="py-3 px-4 font-medium">Coef. d&apos;exploitation</td>
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
                  className={`py-3 px-4 text-right font-mono tabular-nums ${cls}`}
                  data-testid={`coef-${s.codeScenario}`}
                >
                  {formatPct(s.coefExploitation)}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
      <p className="px-4 py-2.5 border-t border-(--border) text-xs text-(--muted-foreground) bg-(--secondary)/40">
        Référence : <strong>{ref.codeScenario}</strong> ({ref.typeScenario}).
        Écarts en % vs cette référence (sur le PNB).
      </p>
    </div>
  );
}

// ─── KPI hero cards (V23 Charte v1) ────────────────────────────────

interface KpiHeroCardProps {
  label: string;
  subtitle: string;
  formula: string;
  value: number;
  tone: 'positive' | 'neutral';
  Icon: LucideIcon;
  testId: string;
}

function KpiHeroCard({
  label,
  subtitle,
  formula,
  value,
  tone,
  Icon,
  testId,
}: KpiHeroCardProps): JSX.Element {
  const config =
    tone === 'positive'
      ? {
          bgHex: '#0F6E5614',
          accentColor: '#0F6E56',
          valueColor: '#063826',
          subtleColor: '#0F6E56',
        }
      : {
          bgHex: '#0C447C14',
          accentColor: '#0C447C',
          valueColor: '#042C53',
          subtleColor: '#185FA5',
        };

  return (
    <div
      className="rounded-lg p-[18px] px-5 relative overflow-hidden"
      style={{ backgroundColor: config.bgHex }}
      data-testid={testId}
    >
      <div className="absolute top-3 right-3" style={{ opacity: 0.18 }}>
        <Icon className="w-11 h-11" style={{ color: config.accentColor }} />
      </div>
      <div
        className="text-[10px] font-semibold uppercase tracking-widest mb-2 relative"
        style={{ color: config.accentColor }}
      >
        {label}
      </div>
      <div
        className="text-[22px] font-medium tabular-nums whitespace-nowrap relative"
        style={{
          color: config.valueColor,
          letterSpacing: '-0.01em',
          lineHeight: 1.1,
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
        }}
      >
        {formatNombre(value)}
      </div>
      <div
        className="text-[11px] mt-2 leading-relaxed relative"
        style={{ color: config.subtleColor }}
      >
        {subtitle}
        <br />
        <span className="opacity-70 text-[10px]">{formula}</span>
      </div>
    </div>
  );
}

interface KpiCoefficientCardProps {
  coefficient: number | null;
  cibleBCEAO: number;
}

function KpiCoefficientCard({
  coefficient,
  cibleBCEAO,
}: KpiCoefficientCardProps): JSX.Element {
  const isMissing = coefficient === null;
  const value = coefficient ?? 0;

  type Tone = 'sain' | 'vigilance' | 'alerte';
  let tone: Tone;
  if (isMissing) tone = 'vigilance';
  else if (value <= cibleBCEAO) tone = 'sain';
  else if (value <= 75) tone = 'vigilance';
  else tone = 'alerte';

  const TONE_CONFIG: Record<
    Tone,
    {
      bgHex: string;
      accentColor: string;
      valueColor: string;
      progressColor: string;
      progressBg: string;
      badgeBg: string;
      badgeText: string;
      badgeLabel: string;
      BadgeIcon: LucideIcon;
    }
  > = {
    sain: {
      bgHex: '#0F6E5614',
      accentColor: '#0F6E56',
      valueColor: '#063826',
      progressColor: '#0F6E56',
      progressBg: 'rgba(15, 110, 86, 0.15)',
      badgeBg: '#C0DD97',
      badgeText: '#173404',
      badgeLabel: 'Sain',
      BadgeIcon: Check,
    },
    vigilance: {
      bgHex: '#BA751714',
      accentColor: '#854F0B',
      valueColor: '#412402',
      progressColor: '#854F0B',
      progressBg: 'rgba(133, 79, 11, 0.15)',
      badgeBg: '#FAC775',
      badgeText: '#412402',
      badgeLabel: 'Vigilance',
      BadgeIcon: AlertCircle,
    },
    alerte: {
      bgHex: '#DC262614',
      accentColor: '#A32D2D',
      valueColor: '#501313',
      progressColor: '#A32D2D',
      progressBg: 'rgba(163, 45, 45, 0.15)',
      badgeBg: '#F09595',
      badgeText: '#501313',
      badgeLabel: 'Alerte',
      BadgeIcon: AlertTriangle,
    },
  };
  const config = TONE_CONFIG[tone];
  const BadgeIcon = config.BadgeIcon;

  const fillWidth = Math.min(100, Math.max(0, value));
  const ciblePosition = Math.min(100, Math.max(0, cibleBCEAO));

  return (
    <div
      className="rounded-lg p-[18px] px-5 relative overflow-hidden"
      style={{ backgroundColor: config.bgHex }}
      data-testid="kpi-coef"
    >
      <div className="absolute top-3 right-3">
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
          style={{
            backgroundColor: config.badgeBg,
            color: config.badgeText,
          }}
        >
          <BadgeIcon className="w-2.5 h-2.5" />
          {config.badgeLabel}
        </span>
      </div>
      <div
        className="text-[10px] font-semibold uppercase tracking-widest mb-2"
        style={{ color: config.accentColor }}
      >
        Coef. exploitation
      </div>
      <div className="flex items-baseline gap-1.5">
        <div
          className="text-[26px] font-medium tabular-nums"
          style={{
            color: config.valueColor,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            fontFamily: 'var(--font-mono), ui-monospace, monospace',
          }}
        >
          {isMissing
            ? '—'
            : value.toLocaleString('fr-FR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
        </div>
        {!isMissing && (
          <div
            className="text-[18px] font-medium"
            style={{ color: config.accentColor }}
          >
            %
          </div>
        )}
      </div>
      <div className="mt-2.5">
        <div
          className="h-[5px] rounded-[3px] relative overflow-hidden"
          style={{ background: config.progressBg }}
        >
          <div
            className="h-full rounded-[3px] transition-all"
            style={{
              width: `${fillWidth}%`,
              background: config.progressColor,
            }}
          />
          <div
            className="absolute -top-[2px] -bottom-[2px] w-[1.5px]"
            style={{
              left: `${ciblePosition}%`,
              background: config.valueColor,
            }}
            title={`Cible BCEAO ${cibleBCEAO}%`}
          />
        </div>
        <div
          className="flex justify-between text-[9px] mt-1"
          style={{ color: config.accentColor }}
        >
          <span>0 %</span>
          <span className="font-semibold">Cible BCEAO {cibleBCEAO} %</span>
          <span>100 %</span>
        </div>
      </div>
    </div>
  );
}

// ─── Détail des sous-totaux (V23 Charte v1) ────────────────────────

interface DetailSousTotauxCardProps {
  totalProduits: number;
  totalCharges: number;
  chargesHorsInterets: number;
  nbCR: number;
}

function DetailSousTotauxCard({
  totalProduits,
  totalCharges,
  chargesHorsInterets,
  nbCR,
}: DetailSousTotauxCardProps): JSX.Element {
  return (
    <div className="bg-white border border-(--border) rounded-md overflow-hidden">
      <div className="px-4 py-2.5 bg-(--secondary) border-b border-(--border) text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
        Détail des sous-totaux
      </div>
      <DetailRow
        label="Total produits (classe 7)"
        value={formatNombre(totalProduits)}
      />
      <DetailRow
        label="Total charges (classe 6)"
        value={formatNombre(totalCharges)}
      />
      <DetailRow
        label="Charges hors intérêts"
        value={formatNombre(chargesHorsInterets)}
      />
      <DetailRow label="CR inclus dans le calcul" value={String(nbCR)} isLast />
    </div>
  );
}

function DetailRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}): JSX.Element {
  return (
    <div
      className={cn(
        'px-4 py-2.5 flex justify-between items-center',
        !isLast && 'border-b border-(--border)',
      )}
    >
      <span className="text-[13px] text-(--muted-foreground)">{label}</span>
      <span className="text-[13px] font-medium tabular-nums font-mono">
        {value}
      </span>
    </div>
  );
}
