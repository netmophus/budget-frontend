/**
 * IndicateursPanel (Lot 3.4) — calcul des indicateurs avancés (Q6) :
 * PNB, MNI, Coefficient d'exploitation.
 *
 * **Limitation MVP** : calcul partiel sur la classe affichée
 * uniquement (calcul côté frontend à partir de la grille déjà
 * chargée). La vue consolidée multi-classe arrivera au Lot 3.6 avec
 * une vue matérialisée backend.
 */
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  GrilleCellule,
  GrilleSaisie,
} from '@/lib/api/budget-grille';

const FORMATTER_FR = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const FORMATTER_PCT = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export interface IndicateursPanelProps {
  isOpen: boolean;
  onClose: () => void;
  grille: GrilleSaisie | null;
  /** Pour appliquer les modifications locales aux totaux. */
  getCelluleEffective: (
    compteId: string,
    ligneMetierId: string,
    mois: string,
  ) => GrilleCellule | null;
}

interface IndicateursValeurs {
  totalClasseAffichee: number;
  totalInteretsPercus76: number;
  totalInteretsVerses67: number;
  totalChargesHorsInterets: number;
  pnb: number | null;
  mni: number | null;
  coefExploitation: number | null;
  classeAffichee: string;
  classesPresentes: string[];
}

function calculerIndicateurs(
  grille: GrilleSaisie | null,
  getCelluleEffective: IndicateursPanelProps['getCelluleEffective'],
): IndicateursValeurs {
  if (!grille) {
    return {
      totalClasseAffichee: 0,
      totalInteretsPercus76: 0,
      totalInteretsVerses67: 0,
      totalChargesHorsInterets: 0,
      pnb: null,
      mni: null,
      coefExploitation: null,
      classeAffichee: '—',
      classesPresentes: [],
    };
  }

  const classesPresentes = new Set<string>();
  let totalClasseAffichee = 0;
  let total76 = 0;
  let total67 = 0;
  let totalCharges6 = 0;
  let totalProduits7 = 0;

  for (const ligne of grille.lignes) {
    const classe = String(ligne.compte.classe);
    classesPresentes.add(classe);
    let totalLigne = 0;
    for (const cell of ligne.cellules) {
      const eff = getCelluleEffective(
        ligne.compte.id,
        ligne.ligneMetier.id,
        cell.mois,
      );
      totalLigne += eff?.montant ?? 0;
    }
    totalClasseAffichee += totalLigne;

    const code = ligne.compte.codeCompte;
    if (code.startsWith('76')) total76 += totalLigne;
    if (code.startsWith('67')) total67 += totalLigne;
    if (classe === '6') totalCharges6 += totalLigne;
    if (classe === '7') totalProduits7 += totalLigne;
  }

  const totalChargesHorsInterets = totalCharges6 - total67;

  // PNB et MNI ne sont pertinents que si on a au moins la classe 6 et 7
  // dans la même grille. Sinon, on retourne null + on affiche un avis.
  const aClassesNecessaires =
    classesPresentes.has('6') && classesPresentes.has('7');

  const pnb = aClassesNecessaires ? totalProduits7 - total67 : null;
  const mni = aClassesNecessaires ? total76 - total67 : null;
  const coefExploitation =
    pnb !== null && pnb > 0
      ? (totalChargesHorsInterets / pnb) * 100
      : null;

  return {
    totalClasseAffichee,
    totalInteretsPercus76: total76,
    totalInteretsVerses67: total67,
    totalChargesHorsInterets,
    pnb,
    mni,
    coefExploitation,
    classeAffichee:
      classesPresentes.size === 1
        ? Array.from(classesPresentes)[0]!
        : Array.from(classesPresentes).sort().join(', ') || '—',
    classesPresentes: Array.from(classesPresentes).sort(),
  };
}

export function IndicateursPanel({
  isOpen,
  onClose,
  grille,
  getCelluleEffective,
}: IndicateursPanelProps) {
  const indicateurs = useMemo(
    () => calculerIndicateurs(grille, getCelluleEffective),
    [grille, getCelluleEffective],
  );

  const aClasses67 =
    indicateurs.classesPresentes.includes('6') &&
    indicateurs.classesPresentes.includes('7');

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>📊 Indicateurs avancés</DialogTitle>
          <DialogDescription>
            Calcul à la volée à partir de la grille affichée et des
            modifications en attente.
          </DialogDescription>
        </DialogHeader>

        {!aClasses67 && (
          <div className="rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 p-3 text-sm">
            <p className="font-semibold mb-1">📍 Vue partielle</p>
            <p>
              La grille affiche uniquement la classe{' '}
              <strong>{indicateurs.classeAffichee}</strong>. Pour calculer
              le PNB et la MNI, le filtre <em>Classe</em> doit inclure les
              classes <strong>6 (Charges)</strong> ET{' '}
              <strong>7 (Produits)</strong>. La vue consolidée
              multi-classe / multi-CR arrivera au <strong>Lot 3.6</strong>.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-2">
          <KpiCard
            label="PNB"
            value={indicateurs.pnb}
            tone="success"
            note="Produit Net Bancaire (cl. 7 − intérêts versés 67xxx)"
          />
          <KpiCard
            label="MNI"
            value={indicateurs.mni}
            tone="info"
            note="Marge Nette d'Intérêt (76xxx − 67xxx)"
          />
          <KpiCardCoef
            value={indicateurs.coefExploitation}
            note="Charges hors intérêts ÷ PNB × 100"
          />
        </div>

        <div className="rounded-md border border-(--border) bg-(--muted)/30 p-3 text-xs space-y-1">
          <p className="font-semibold">Détail des sous-totaux</p>
          <div className="grid grid-cols-2 gap-1">
            <span>Total classe affichée :</span>
            <span className="text-right font-mono">
              {FORMATTER_FR.format(indicateurs.totalClasseAffichee)}
            </span>
            <span>Intérêts perçus (76xxx) :</span>
            <span className="text-right font-mono">
              {FORMATTER_FR.format(indicateurs.totalInteretsPercus76)}
            </span>
            <span>Intérêts versés (67xxx) :</span>
            <span className="text-right font-mono">
              {FORMATTER_FR.format(indicateurs.totalInteretsVerses67)}
            </span>
            <span>Charges hors intérêts :</span>
            <span className="text-right font-mono">
              {FORMATTER_FR.format(indicateurs.totalChargesHorsInterets)}
            </span>
          </div>
        </div>

        <p className="text-xs text-(--muted-foreground) italic">
          Les indicateurs ne sont pas mis à jour automatiquement après
          chaque saisie. Recalculez en réouvrant ce panneau après vos
          modifications.
        </p>

        <DialogFooter>
          <Button onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── KPI cards ─────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number | null;
  tone: 'success' | 'info';
  note: string;
}

function KpiCard({ label, value, tone, note }: KpiCardProps) {
  const cls =
    tone === 'success'
      ? 'border-green-300 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
      : 'border-blue-300 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400';
  return (
    <div className={`rounded-md border p-3 text-center ${cls}`}>
      <div className="text-xs uppercase tracking-wide font-semibold">
        {label}
      </div>
      <div className="text-xl font-bold font-mono mt-1">
        {value !== null ? FORMATTER_FR.format(value) : '—'}
      </div>
      <div className="text-[10px] mt-1 opacity-80">{note}</div>
    </div>
  );
}

function KpiCardCoef({ value, note }: { value: number | null; note: string }) {
  const alerte = value !== null && value > 100;
  const cls = alerte
    ? 'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
    : 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400';
  return (
    <div className={`rounded-md border p-3 text-center ${cls}`}>
      <div className="text-xs uppercase tracking-wide font-semibold">
        Coef. exploitation
      </div>
      <div className="text-xl font-bold font-mono mt-1">
        {value !== null ? `${FORMATTER_PCT.format(value)} %` : '—'}
      </div>
      <div className="text-[10px] mt-1 opacity-80">
        {alerte ? '⚠ supérieur à 100% — non viable' : note}
      </div>
    </div>
  );
}
