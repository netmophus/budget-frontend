/**
 * EcartsTable (Lot 5.2.C) — tableau des écarts avec mise en
 * forme conditionnelle par niveau d'alerte (fond léger ligne
 * entière), badge nature compte, icône sens favorable/
 * défavorable, et tri cliquable par colonne.
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
  | 'ecartAbs'
  | 'ecartPct';

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

function classeFondLigne(n: NiveauAlerte): string {
  if (n === 'CRITIQUE') return 'bg-red-50';
  if (n === 'ATTENTION') return 'bg-amber-50';
  if (n === 'MANQUANT') return 'bg-(--muted)/30';
  return '';
}

function badgeNiveau(n: NiveauAlerte): string {
  if (n === 'CRITIQUE') return 'bg-red-200 text-red-900';
  if (n === 'ATTENTION') return 'bg-amber-200 text-amber-900';
  if (n === 'MANQUANT') return 'bg-(--muted) text-(--muted-foreground)';
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

export function EcartsTable({ lignes }: Props): JSX.Element {
  const [colonne, setColonne] = useState<ColonneTri>('ecartAbs');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');

  const lignesTriees = useMemo(() => {
    const arr = [...lignes];
    arr.sort((a, b) => {
      const va = a[colonne];
      const vb = b[colonne];
      const an =
        typeof va === 'number' ? va : va === null ? -Infinity : Number.NaN;
      const bn =
        typeof vb === 'number' ? vb : vb === null ? -Infinity : Number.NaN;
      let cmp: number;
      if (Number.isFinite(an) && Number.isFinite(bn)) {
        cmp = an - bn;
      } else {
        cmp = String(va ?? '').localeCompare(String(vb ?? ''));
      }
      return direction === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [lignes, colonne, direction]);

  function trier(col: ColonneTri): void {
    if (col === colonne) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
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
        Aucune ligne disponible. Vérifiez les filtres et que le réalisé a
        bien été validé pour cette période.
      </p>
    );
  }

  return (
    <table
      className="w-full text-xs"
      data-testid="ecarts-table"
    >
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
          <th className="p-2 text-left">Niveau</th>
          <th className="p-2 text-left">Sens</th>
        </tr>
      </thead>
      <tbody>
        {lignesTriees.map((l, i) => (
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
        ))}
      </tbody>
    </table>
  );
}
