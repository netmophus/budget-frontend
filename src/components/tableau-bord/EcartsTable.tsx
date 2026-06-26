/**
 * EcartsTable — tableau « compte de résultat » Budget vs Réalisé (PR1).
 *
 * Les lignes sont regroupées par nature (Produits classe 7 → Charges
 * classe 6 → Autres) avec une ligne de SOUS-TOTAL après chaque bloc et
 * une ligne SOLDE (Produits − Charges) en bas. Colonnes : Budget,
 * Réalisé, Écart, Écart %, % d'exécution, Niveau, Sens. Tri cliquable
 * appliqué À L'INTÉRIEUR de chaque bloc.
 */
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  type LigneEcart,
  type NatureCompte,
  type NiveauAlerte,
  NIVEAU_LABEL,
} from '@/lib/api/tableau-bord';
import { formaterMois } from '@/lib/format/mois';

interface Props {
  lignes: LigneEcart[];
}

type ColonneTri =
  | 'codeCr'
  | 'codeCompte'
  | 'mois'
  | 'montantBudget'
  | 'montantRealise'
  | 'ecart'
  | 'ecartAbs' // tri par défaut (pas d'en-tête dédié)
  | 'ecartPct'
  | 'tauxExecution';

function formatMontant(n: number | null): string {
  if (n === null) return '—';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPct(n: number | null): string {
  if (n === null) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function formatTaux(n: number | null): string {
  return n === null ? '—' : `${n.toFixed(0)} %`;
}

function classeFondLigne(n: NiveauAlerte): string {
  if (n === 'CRITIQUE') return 'bg-red-50';
  if (n === 'ATTENTION') return 'bg-amber-50';
  if (n === 'MANQUANT') return 'bg-(--muted)/30';
  if (n === 'SANS_BUDGET') return 'bg-orange-50';
  return '';
}

function badgeNiveau(n: NiveauAlerte): string {
  if (n === 'CRITIQUE') return 'bg-red-200 text-red-900';
  if (n === 'ATTENTION') return 'bg-amber-200 text-amber-900';
  if (n === 'MANQUANT') return 'bg-(--muted) text-(--muted-foreground)';
  if (n === 'SANS_BUDGET') return 'bg-orange-200 text-orange-900';
  return 'bg-green-200 text-green-900';
}

function badgeNature(n: NatureCompte): string {
  if (n === 'CHARGE') return 'bg-rose-100 text-rose-800';
  if (n === 'PRODUIT') return 'bg-emerald-100 text-emerald-800';
  return 'bg-slate-100 text-slate-700';
}

function couleurEcart(l: LigneEcart): string {
  if (l.sensEcart === 'DEFAVORABLE') return 'text-red-700';
  if (l.sensEcart === 'FAVORABLE') return 'text-green-700';
  return 'text-(--muted-foreground)';
}

function iconeSens(l: LigneEcart): JSX.Element {
  if (l.sensEcart === 'FAVORABLE')
    return <ArrowUp className="h-3 w-3 inline text-green-700" />;
  if (l.sensEcart === 'DEFAVORABLE')
    return <ArrowDown className="h-3 w-3 inline text-red-700" />;
  return <Minus className="h-3 w-3 inline text-(--muted-foreground)" />;
}

interface Sous {
  budget: number;
  realise: number;
  ecart: number;
  taux: number | null;
}

function sommeGroupe(lignes: LigneEcart[]): Sous {
  let budget = 0;
  let realise = 0;
  for (const l of lignes) {
    budget += l.montantBudget ?? 0;
    realise += l.montantRealise ?? 0;
  }
  const ecart = realise - budget;
  return { budget, realise, ecart, taux: budget !== 0 ? (realise / budget) * 100 : null };
}

export function EcartsTable({ lignes }: Props): JSX.Element {
  const [colonne, setColonne] = useState<ColonneTri>('ecartAbs');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');

  const { produits, charges, autres } = useMemo(() => {
    const trier = (arr: LigneEcart[]): LigneEcart[] =>
      [...arr].sort((a, b) => {
        const va = a[colonne];
        const vb = b[colonne];
        const an =
          typeof va === 'number' ? va : va === null ? -Infinity : Number.NaN;
        const bn =
          typeof vb === 'number' ? vb : vb === null ? -Infinity : Number.NaN;
        let cmp: number;
        if (Number.isFinite(an) && Number.isFinite(bn)) cmp = an - bn;
        else cmp = String(va ?? '').localeCompare(String(vb ?? ''));
        return direction === 'asc' ? cmp : -cmp;
      });
    return {
      produits: trier(lignes.filter((l) => l.classeCompte === '7')),
      charges: trier(lignes.filter((l) => l.classeCompte === '6')),
      autres: trier(
        lignes.filter((l) => l.classeCompte !== '6' && l.classeCompte !== '7'),
      ),
    };
  }, [lignes, colonne, direction]);

  function trier(col: ColonneTri): void {
    if (col === colonne) setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setColonne(col);
      setDirection('desc');
    }
  }

  function thTriable(col: ColonneTri, label: string, align: 'l' | 'r' = 'l') {
    const actif = colonne === col;
    return (
      <th
        className={`p-2 text-${align === 'l' ? 'left' : 'right'} cursor-pointer hover:bg-(--accent)/30`}
        onClick={() => trier(col)}
        data-testid={`th-${col}`}
      >
        {label} {actif ? (direction === 'asc' ? '▲' : '▼') : ''}
      </th>
    );
  }

  if (lignes.length === 0) {
    return (
      <p
        className="text-sm text-(--muted-foreground)"
        data-testid="empty-ecarts"
      >
        Aucune ligne disponible. Vérifiez les filtres et que le réalisé a bien
        été validé pour cette période.
      </p>
    );
  }

  const sp = sommeGroupe(produits);
  const sc = sommeGroupe(charges);
  const soldeBudget = sp.budget - sc.budget;
  const soldeRealise = sp.realise - sc.realise;
  const solde: Sous = {
    budget: soldeBudget,
    realise: soldeRealise,
    ecart: soldeRealise - soldeBudget,
    taux: soldeBudget !== 0 ? (soldeRealise / soldeBudget) * 100 : null,
  };

  function ligneTr(l: LigneEcart, i: number): JSX.Element {
    return (
      <tr
        key={`${l.codeCr}-${l.codeCompte}-${l.codeLigneMetier}-${l.mois}-${i}`}
        className={`border-b border-(--border)/50 ${classeFondLigne(l.niveauAlerte)}`}
        data-testid={`ligne-${l.codeCr}-${l.codeCompte}-${l.mois}`}
      >
        <td className="p-2">
          <div className="font-medium">{l.codeCr}</div>
          <div className="text-(--muted-foreground)">
            {l.libelleCr.slice(0, 28)}
          </div>
        </td>
        <td className="p-2">
          <div className="font-medium">{l.codeCompte}</div>
          <div className="text-(--muted-foreground)">
            {l.libelleCompte.slice(0, 28)}
          </div>
        </td>
        <td className="p-2">
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${badgeNature(l.natureCompte)}`}
          >
            {l.natureCompte}
          </span>
        </td>
        <td className="p-2">{l.codeLigneMetier}</td>
        <td className="p-2 whitespace-nowrap">{formaterMois(l.mois)}</td>
        <td className="p-2 text-right tabular-nums">
          {formatMontant(l.montantBudget)}
        </td>
        <td className="p-2 text-right tabular-nums">
          {formatMontant(l.montantRealise)}
        </td>
        <td className={`p-2 text-right tabular-nums ${couleurEcart(l)}`}>
          {l.ecart === null ? '—' : formatMontant(l.ecart)}
        </td>
        <td className={`p-2 text-right tabular-nums ${couleurEcart(l)}`}>
          {formatPct(l.ecartPct)}
        </td>
        <td className="p-2 text-right tabular-nums">
          {formatTaux(l.tauxExecution)}
        </td>
        <td className="p-2">
          <Badge
            variant="secondary"
            className={`text-xs ${badgeNiveau(l.niveauAlerte)}`}
          >
            {NIVEAU_LABEL[l.niveauAlerte]}
          </Badge>
        </td>
        <td className="p-2 text-center">{iconeSens(l)}</td>
      </tr>
    );
  }

  function sousTotalTr(
    label: string,
    s: Sous,
    testid: string,
    fond: string,
  ): JSX.Element {
    return (
      <tr
        className={`border-b border-(--border) font-semibold ${fond}`}
        data-testid={testid}
      >
        <td className="p-2 uppercase tracking-wide text-[11px]" colSpan={5}>
          {label}
        </td>
        <td className="p-2 text-right tabular-nums">
          {formatMontant(s.budget)}
        </td>
        <td className="p-2 text-right tabular-nums">
          {formatMontant(s.realise)}
        </td>
        <td className="p-2 text-right tabular-nums">{formatMontant(s.ecart)}</td>
        <td className="p-2" />
        <td className="p-2 text-right tabular-nums">{formatTaux(s.taux)}</td>
        <td className="p-2" colSpan={2} />
      </tr>
    );
  }

  return (
    <table className="w-full text-xs" data-testid="ecarts-table">
      <thead className="text-(--muted-foreground) border-b border-(--border)">
        <tr>
          {thTriable('codeCr', 'CR')}
          {thTriable('codeCompte', 'Compte')}
          <th className="p-2 text-left">Nature</th>
          <th className="p-2 text-left">Ligne métier</th>
          {thTriable('mois', 'Mois')}
          {thTriable('montantBudget', 'Budget', 'r')}
          {thTriable('montantRealise', 'Réalisé', 'r')}
          {thTriable('ecart', 'Écart', 'r')}
          {thTriable('ecartPct', 'Écart %', 'r')}
          {thTriable('tauxExecution', '% exéc.', 'r')}
          <th className="p-2 text-left">Niveau</th>
          <th className="p-2 text-left">Sens</th>
        </tr>
      </thead>
      <tbody>
        {produits.map((l, i) => ligneTr(l, i))}
        {produits.length > 0 &&
          sousTotalTr(
            'Sous-total Produits',
            sp,
            'sous-total-produits',
            'bg-emerald-50',
          )}
        {charges.map((l, i) => ligneTr(l, i))}
        {charges.length > 0 &&
          sousTotalTr(
            'Sous-total Charges',
            sc,
            'sous-total-charges',
            'bg-rose-50',
          )}
        {autres.map((l, i) => ligneTr(l, i))}
        {(produits.length > 0 || charges.length > 0) &&
          sousTotalTr('Solde (Produits − Charges)', solde, 'solde', 'bg-(--secondary)')}
      </tbody>
    </table>
  );
}
