/**
 * KpiCardsRow — refonte « compte de résultat » (PR1).
 *
 * 2 lignes de 4 cartes :
 *  - Ligne 1 : PNB Budget · PNB Réalisé · Coef. exploitation Budget ·
 *    Coef. exploitation Réalisé
 *  - Ligne 2 : Lignes avec écart · ≥ critique · ≥ attention · Sans budget
 *
 * État erreur : affiche « — » au lieu des chiffres.
 */
import { type KpiEcarts, type TotauxEcarts } from '@/lib/api/tableau-bord';
import { COULEUR_REALISE, COULEURS_NIVEAU } from '@/lib/colors/niveaux-alerte';

const COULEUR_ACCENT = '#0C447C'; // --miznas-bleu-nuit (budget)

interface Props {
  kpi: KpiEcarts;
  totaux: TotauxEcarts;
  /** Si true, affiche "—" à la place des chiffres (état échec API). */
  erreur?: boolean;
}

function fmtFcfa(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number | null): string {
  return n === null ? '—' : `${n.toFixed(1)} %`;
}

export function KpiCardsRow({ kpi, totaux, erreur }: Props): JSX.Element {
  return (
    <div className="space-y-2.5 mb-4" data-testid="kpi-cards">
      {/* ── Ligne 1 — compte de résultat ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <KpiCard
          label="PNB Budget"
          dotHex={COULEUR_ACCENT}
          valueColorHex={erreur ? undefined : COULEUR_ACCENT}
        >
          <span data-testid="kpi-pnb-budget" className="text-[20px] font-mono">
            {erreur ? '—' : fmtFcfa(totaux.pnb.budget)}
          </span>
        </KpiCard>
        <KpiCard
          label="PNB Réalisé"
          dotHex={COULEUR_REALISE}
          valueColorHex={erreur ? undefined : COULEUR_REALISE}
        >
          <span data-testid="kpi-pnb-realise" className="text-[20px] font-mono">
            {erreur ? '—' : fmtFcfa(totaux.pnb.realise)}
          </span>
        </KpiCard>
        <KpiCard
          label="Coef. exploitation Budget"
          dotHex={COULEUR_ACCENT}
          valueColorHex={erreur ? undefined : COULEUR_ACCENT}
        >
          <span data-testid="kpi-ce-budget">
            {erreur ? '—' : fmtPct(totaux.coefExploitationBudget)}
          </span>
        </KpiCard>
        <KpiCard
          label="Coef. exploitation Réalisé"
          dotHex={COULEUR_REALISE}
          valueColorHex={erreur ? undefined : COULEUR_REALISE}
        >
          <span data-testid="kpi-ce-realise">
            {erreur ? '—' : fmtPct(totaux.coefExploitationRealise)}
          </span>
        </KpiCard>
      </div>

      {/* ── Ligne 2 — alertes ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <KpiCard
          label="Lignes avec écart"
          dotHex={COULEURS_NIVEAU.MANQUANT}
          valueColorHex={erreur ? undefined : COULEUR_ACCENT}
        >
          <span data-testid="kpi-total">
            {erreur ? '—' : String(kpi.nbEcartsTotal)}
          </span>
        </KpiCard>
        <KpiCard
          label="≥ Seuil critique"
          dotHex={COULEURS_NIVEAU.CRITIQUE}
          valueColorHex={
            erreur
              ? undefined
              : kpi.nbEcartsCritique > 0
                ? COULEURS_NIVEAU.CRITIQUE
                : COULEUR_ACCENT
          }
        >
          <span data-testid="kpi-critique">
            {erreur ? '—' : String(kpi.nbEcartsCritique)}
          </span>
        </KpiCard>
        <KpiCard
          label="≥ Seuil attention"
          dotHex={COULEURS_NIVEAU.ATTENTION}
          valueColorHex={
            erreur
              ? undefined
              : kpi.nbEcartsAttention > 0
                ? COULEURS_NIVEAU.ATTENTION
                : COULEUR_ACCENT
          }
        >
          <span data-testid="kpi-attention">
            {erreur ? '—' : String(kpi.nbEcartsAttention)}
          </span>
        </KpiCard>
        <KpiCard
          label="Sans budget"
          dotHex={COULEURS_NIVEAU.SANS_BUDGET}
          valueColorHex={
            erreur
              ? undefined
              : kpi.nbSansBudget > 0
                ? COULEURS_NIVEAU.SANS_BUDGET
                : COULEUR_ACCENT
          }
        >
          <span data-testid="kpi-sans-budget">
            {erreur ? '—' : String(kpi.nbSansBudget)}
          </span>
        </KpiCard>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  dotHex,
  valueColorHex,
  children,
}: {
  label: string;
  dotHex: string;
  valueColorHex: string | undefined;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="bg-white border border-(--border) rounded-md p-3.5">
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="w-[7px] h-[7px] rounded-full"
          style={{ backgroundColor: dotHex }}
          aria-hidden="true"
        />
        <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider">
          {label}
        </div>
      </div>
      <div
        className="text-[28px] font-medium tabular-nums leading-none"
        style={valueColorHex ? { color: valueColorHex } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
