/**
 * KpiCardsRow (Lot 5.2.C + refonte Lot 7.3 V24 Charte v1).
 *
 * 4 cards horizontales avec les KPI principaux du tableau de bord
 * Budget vs Réalisé.
 *
 * État erreur (Lot 5-fix-ui) : affiche `—` au lieu de `0` quand
 * l'API a échoué — `0` était trompeur (pouvait suggérer "aucun
 * écart" alors que la requête n'avait pas abouti).
 *
 * Refonte V24 :
 *  - Pattern KpiAlertCard avec pastille colorée + label uppercase
 *    + valeur 28px tabular-nums (cohérent V19/V21)
 *  - 4e KPI = Écart total absolu avec décomposition fav/défav
 *    (valeur principale = chiffre brut pour préserver l'unicité
 *    du textContent attendu par les tests).
 *  - data-testid kpi-cards / kpi-total / kpi-critique /
 *    kpi-attention / kpi-total-abs PRÉSERVÉS strictement (les
 *    tests vérifient `textContent === '17'` exact, donc pas de
 *    contenu textuel parasite dans le conteneur).
 */
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

import { type KpiEcarts } from '@/lib/api/tableau-bord';
import { COULEURS_NIVEAU } from '@/lib/colors/niveaux-alerte';
import { cn } from '@/lib/utils';

// Lot 8.5.C — alias locaux pour préserver la lisibilité des couleurs
// non-niveau (favorable/défavorable + accent bleu nuit) qui ne sont
// pas dans COULEURS_NIVEAU. La couleur défavorable = couleur CRITIQUE,
// la couleur favorable = couleur NORMAL (cohérence métier MIZNAS).
const COULEUR_ACCENT = '#0C447C'; // --miznas-bleu-nuit, KPI valeur principale
const COULEUR_DEFAVORABLE = COULEURS_NIVEAU.CRITIQUE;
const COULEUR_FAVORABLE = COULEURS_NIVEAU.NORMAL;

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

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4"
      data-testid="kpi-cards"
    >
      <KpiAlertShell
        label="Lignes avec écart"
        dotHex={COULEURS_NIVEAU.MANQUANT}
        valueColorHex={erreur ? undefined : COULEUR_ACCENT}
      >
        <span data-testid="kpi-total">{nbTotal}</span>
      </KpiAlertShell>

      <KpiAlertShell
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
        <span data-testid="kpi-critique">{nbCritique}</span>
      </KpiAlertShell>

      <KpiAlertShell
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
        <span data-testid="kpi-attention">{nbAttention}</span>
      </KpiAlertShell>

      {/* 4e KPI : Écart total absolu avec décomposition fav/défav */}
      <div
        className={cn(
          'bg-white border border-(--border) rounded-md p-3.5',
          erreur && 'bg-(--muted)/30',
        )}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className="w-[7px] h-[7px] rounded-full"
            style={{ backgroundColor: COULEUR_ACCENT }}
            aria-hidden="true"
          />
          <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider">
            Écart total absolu
          </div>
        </div>
        <div className="flex items-baseline gap-1.5 mb-1.5">
          <span
            className="text-[22px] font-medium tabular-nums leading-none font-mono whitespace-nowrap"
            style={{ color: erreur ? undefined : COULEUR_ACCENT }}
            data-testid="kpi-total-abs"
          >
            {totalAbs}
          </span>
          <span className="text-[11px] text-(--muted-foreground)">FCFA</span>
        </div>
        <div className="flex flex-wrap gap-2.5 text-[10px] tabular-nums">
          <span className="inline-flex items-center gap-0.5">
            <ArrowDownRight
              className="w-2.5 h-2.5"
              style={{ color: COULEUR_DEFAVORABLE }}
            />
            <span
              className="font-medium"
              style={{ color: erreur ? undefined : COULEUR_DEFAVORABLE }}
            >
              défavorable : {defav}
            </span>
          </span>
          <span className="inline-flex items-center gap-0.5">
            <ArrowUpRight
              className="w-2.5 h-2.5"
              style={{ color: COULEUR_FAVORABLE }}
            />
            <span
              className="font-medium"
              style={{ color: erreur ? undefined : COULEUR_FAVORABLE }}
            >
              favorable : {fav}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function KpiAlertShell({
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
