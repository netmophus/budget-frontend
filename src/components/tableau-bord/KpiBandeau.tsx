/**
 * KpiBandeau (Lot 7.2) — bande de KPI affichée en haut du dashboard,
 * juste sous le PageHeader et au-dessus des 9 cartes pédagogiques.
 *
 * 3 cartes :
 *  1. PNB consolidé sur le périmètre RBAC (BUDGET.LIRE)
 *  2. Coefficient d'exploitation (BUDGET.LIRE) — coloré selon les
 *     seuils UEMOA (sain < 70 %, attention 70-100 %, alerte > 100 %)
 *  3. Versions à valider — compteur des versions au statut 'soumis',
 *     visible uniquement avec BUDGET.VALIDER ou BUDGET.PUBLIER (any)
 *
 * Les 2 premiers KPI consomment GET /budget/indicateurs/home, qui
 * résout automatiquement le triplet (version / scénario / exercice)
 * côté backend — pas de sélecteur sur la home. Si aucune version
 * éligible, les valeurs s'affichent "—" avec un sous-libellé clair.
 *
 * Charte v1 :
 *  - Valeurs principales : `text-3xl font-bold tabular-nums` bleu nuit #0C447C
 *  - Coef coloré selon classement métier (vert/ambre/rouge)
 *  - Card cliquable "Versions à valider" : border-left ambre #BA7517 au hover
 */
import { AlertTriangle, ClipboardList, Coins, Percent } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Can } from '@/components/common/Can';
import { cn } from '@/lib/utils';
import {
  classerCoefExploitation,
  getIndicateursHome,
  type IndicateursHome,
} from '@/lib/api/indicateurs';
import { listVersions } from '@/lib/api/versions';
import { formatMontant } from '@/lib/labels/budget';

const COEF_FORMATTER = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatCoef(coef: number | null): string {
  if (coef === null) return '—';
  return `${COEF_FORMATTER.format(coef)} %`;
}

function classeCoefCouleur(coef: number | null): string {
  switch (classerCoefExploitation(coef)) {
    case 'sain':
      return 'text-green-700';
    case 'attention':
      return 'text-amber-700';
    case 'alerte':
      return 'text-red-700';
    default:
      return 'text-(--muted-foreground)';
  }
}

const CARD_BASE =
  'rounded-md border border-(--border) bg-(--background) p-4 ' +
  'border-l-[3px] border-l-transparent';

export function KpiBandeau() {
  return (
    <Can permission="BUDGET.LIRE">
      <KpiBandeauInner />
    </Can>
  );
}

function KpiBandeauInner() {
  const [data, setData] = useState<IndicateursHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await getIndicateursHome();
        if (!cancelled) setData(res);
      } catch {
        if (!cancelled) setErreur(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
      data-testid="kpi-bandeau"
    >
      <KpiPnb data={data} loading={loading} erreur={erreur} />
      <KpiCoef data={data} loading={loading} erreur={erreur} />
      <Can
        permissions={['BUDGET.VALIDER', 'BUDGET.PUBLIER']}
        mode="any"
        fallback={null}
      >
        <KpiVersionsAValider />
      </Can>
    </div>
  );
}

interface KpiChildProps {
  data: IndicateursHome | null;
  loading: boolean;
  erreur: boolean;
}

function SousLibelle({
  loading,
  erreur,
  data,
}: KpiChildProps): JSX.Element {
  if (loading) {
    return (
      <span className="text-(--muted-foreground)">Chargement…</span>
    );
  }
  if (erreur) {
    return (
      <span className="inline-flex items-center gap-1 text-red-700">
        <AlertTriangle className="h-3 w-3" /> Erreur de chargement
      </span>
    );
  }
  if (!data?.defauts) {
    return (
      <span className="text-(--muted-foreground)">
        Aucune version éligible
      </span>
    );
  }
  return (
    <span className="text-(--muted-foreground)">
      {data.defauts.codeVersion} · {data.defauts.libelleScenario} ·{' '}
      {data.defauts.exerciceFiscal}
    </span>
  );
}

function KpiPnb({ data, loading, erreur }: KpiChildProps): JSX.Element {
  const valeur =
    loading || erreur || !data?.indicateurs
      ? '—'
      : formatMontant(data.indicateurs.pnb, 'XOF');
  return (
    <div className={CARD_BASE} data-testid="kpi-pnb">
      <div className="flex items-start gap-3">
        <Coins className="h-5 w-5 shrink-0 text-[#0C447C]" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-(--muted-foreground) mb-1">
            Produit Net Bancaire
          </div>
          <div
            className="text-3xl font-bold tabular-nums text-[#0C447C] truncate"
            data-testid="kpi-pnb-valeur"
            title={typeof valeur === 'string' ? valeur : undefined}
          >
            {valeur}
            {valeur !== '—' && (
              <span className="text-sm font-normal text-(--muted-foreground) ml-1">
                FCFA
              </span>
            )}
          </div>
          <div className="text-xs mt-1">
            <SousLibelle data={data} loading={loading} erreur={erreur} />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCoef({ data, loading, erreur }: KpiChildProps): JSX.Element {
  const coef = data?.indicateurs?.coefExploitation ?? null;
  const valeur = loading || erreur ? '—' : formatCoef(coef);
  const couleur = loading || erreur ? 'text-[#0C447C]' : classeCoefCouleur(coef);
  return (
    <div className={CARD_BASE} data-testid="kpi-coef">
      <div className="flex items-start gap-3">
        <Percent className="h-5 w-5 shrink-0 text-[#0C447C]" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-(--muted-foreground) mb-1">
            Coefficient d&apos;exploitation
          </div>
          <div
            className={cn(
              'text-3xl font-bold tabular-nums',
              couleur,
            )}
            data-testid="kpi-coef-valeur"
          >
            {valeur}
          </div>
          <div className="text-xs mt-1">
            <SousLibelle data={data} loading={loading} erreur={erreur} />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiVersionsAValider(): JSX.Element {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // limit=1 : on ne veut que le `total`, pas les items.
        const res = await listVersions({ statut: 'soumis', limit: 1 });
        if (!cancelled) setCount(res.total);
      } catch {
        if (!cancelled) setErreur(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const valeur = loading || erreur ? '—' : String(count ?? 0);

  return (
    <Link
      to="/budget/versions"
      className={cn(
        CARD_BASE,
        'block hover:border-l-[#BA7517] transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--primary)',
      )}
      data-testid="kpi-versions-a-valider"
    >
      <div className="flex items-start gap-3">
        <ClipboardList className="h-5 w-5 shrink-0 text-[#0C447C]" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-(--muted-foreground) mb-1">
            Versions à valider
          </div>
          <div
            className="text-3xl font-bold tabular-nums text-[#0C447C]"
            data-testid="kpi-versions-valeur"
          >
            {valeur}
          </div>
          <div className="text-xs mt-1 text-(--muted-foreground)">
            {erreur
              ? 'Erreur de chargement'
              : loading
                ? 'Chargement…'
                : count === 0
                  ? 'Aucune version en attente'
                  : "Voir les versions soumises"}
          </div>
        </div>
      </div>
    </Link>
  );
}
