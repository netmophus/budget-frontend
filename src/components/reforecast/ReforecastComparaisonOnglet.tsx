/**
 * Onglet Comparaison de la page détail reforecast (Lot 5.3.B).
 * Tableau comparatif source vs reforecast + filtres + KPI + tri.
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type ComparaisonResponse,
  type LigneComparaison,
  getReforecastComparaison,
} from '@/lib/api/reforecast';
import { formaterMois } from '@/lib/format/mois';
import { OrigineBadge } from './ReforecastBadges';

interface Props {
  reforecastId: string;
  trimestreConsolide: number;
}

type FiltreLignes = 'TOUS' | 'AVEC_ECART' | 'CONSOLIDE' | 'EXTRAPOLE';

function formatMontant(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPct(num: number, den: number): string {
  if (den === 0) return num === 0 ? '0.0%' : '∞';
  const v = (num / Math.abs(den)) * 100;
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}

function moisYM(annee: number, mois: number): string {
  return `${annee}-${String(mois).padStart(2, '0')}`;
}

function trimestreDuMois(mois: number): number {
  return Math.floor((mois - 1) / 3) + 1;
}

export function ReforecastComparaisonOnglet({
  reforecastId,
  trimestreConsolide,
}: Props): JSX.Element {
  const [data, setData] = useState<ComparaisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState<FiltreLignes>('TOUS');
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    setLoading(true);
    getReforecastComparaison(reforecastId)
      .then((r) => setData(r))
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Erreur';
        toast.error(`Chargement comparaison : ${msg}`);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [reforecastId]);

  const lignesFiltrees = useMemo<LigneComparaison[]>(() => {
    if (!data) return [];
    const r = recherche.trim().toLowerCase();
    return data.lignes
      .filter((l) => {
        if (filtre === 'AVEC_ECART' && l.ecart === 0) return false;
        if (
          filtre === 'CONSOLIDE' &&
          trimestreDuMois(l.mois) > trimestreConsolide
        )
          return false;
        if (
          filtre === 'EXTRAPOLE' &&
          trimestreDuMois(l.mois) <= trimestreConsolide
        )
          return false;
        if (r) {
          const target = `${l.codeCr} ${l.codeCompte}`.toLowerCase();
          if (!target.includes(r)) return false;
        }
        return true;
      })
      .sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart));
  }, [data, filtre, recherche, trimestreConsolide]);

  const kpiAjustees = data
    ? data.lignes.filter((l) => l.ecart !== 0).length
    : 0;
  const kpiInchangees = data
    ? data.lignes.filter((l) => l.ecart === 0).length
    : 0;

  if (loading) {
    return (
      <p className="text-sm text-(--muted-foreground)">
        Chargement de la comparaison…
      </p>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-(--muted-foreground)">
        Comparaison indisponible.
      </p>
    );
  }

  return (
    <div className="space-y-4" data-testid="rf-comparaison">
      {/* KPI */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-3"
        data-testid="rf-comparaison-kpi"
      >
        <div className="rounded-md border border-(--border) p-3">
          <div
            className="text-2xl font-bold tabular-nums"
            data-testid="rf-kpi-total-abs"
          >
            {formatMontant(Math.abs(data.totalEcart))}
          </div>
          <div className="text-xs text-(--muted-foreground) mt-1">
            écart total absolu (FCFA){' '}
            {data.totalEcart < 0 ? '↓' : data.totalEcart > 0 ? '↑' : ''}
          </div>
        </div>
        <div className="rounded-md border border-(--border) p-3">
          <div
            className="text-2xl font-bold tabular-nums"
            data-testid="rf-kpi-ajustees"
          >
            {kpiAjustees}
          </div>
          <div className="text-xs text-(--muted-foreground) mt-1">
            lignes ajustées
          </div>
        </div>
        <div className="rounded-md border border-(--border) p-3">
          <div
            className="text-2xl font-bold tabular-nums"
            data-testid="rf-kpi-inchangees"
          >
            {kpiInchangees}
          </div>
          <div className="text-xs text-(--muted-foreground) mt-1">
            lignes inchangées
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="rf-cmp-filtre">Afficher</Label>
          <Select value={filtre} onValueChange={(v) => setFiltre(v as never)}>
            <SelectTrigger id="rf-cmp-filtre" data-testid="rf-cmp-filtre">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TOUS">Toutes les lignes</SelectItem>
              <SelectItem value="AVEC_ECART">Avec écart</SelectItem>
              <SelectItem value="CONSOLIDE">Trimestre consolidé</SelectItem>
              <SelectItem value="EXTRAPOLE">Trimestres extrapolés</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="rf-cmp-recherche">Recherche (CR / compte)</Label>
          <Input
            id="rf-cmp-recherche"
            data-testid="rf-cmp-recherche"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </div>
        <div className="ml-auto text-xs text-(--muted-foreground)">
          <span data-testid="rf-cmp-compteur">{lignesFiltrees.length}</span> /{' '}
          {data.lignes.length}
        </div>
      </div>

      {/* Tableau */}
      {lignesFiltrees.length === 0 ? (
        <p
          className="text-sm text-(--muted-foreground)"
          data-testid="rf-cmp-empty"
        >
          Aucune ligne ne correspond aux filtres.
        </p>
      ) : (
        <table className="w-full text-xs" data-testid="rf-cmp-table">
          <thead className="text-(--muted-foreground) border-b border-(--border)">
            <tr>
              <th className="p-2 text-left">CR</th>
              <th className="p-2 text-left">Compte</th>
              <th className="p-2 text-left">Ligne métier</th>
              <th className="p-2 text-left">Mois</th>
              <th className="p-2 text-right">Source</th>
              <th className="p-2 text-right">Reforecast</th>
              <th className="p-2 text-right">Écart</th>
              <th className="p-2 text-right">Écart %</th>
              <th className="p-2 text-left">Origine</th>
            </tr>
          </thead>
          <tbody>
            {lignesFiltrees.map((l, i) => (
              <tr
                key={`${l.fkCentre}-${l.fkCompte}-${l.fkTemps}-${i}`}
                className="border-b border-(--border)/50"
                data-testid={`rf-cmp-row-${l.codeCr}-${l.codeCompte}-${l.mois}`}
              >
                <td className="p-2 font-medium">{l.codeCr}</td>
                <td className="p-2 font-medium">{l.codeCompte}</td>
                <td className="p-2">{l.codeLigneMetier}</td>
                <td className="p-2 whitespace-nowrap">
                  {formaterMois(moisYM(l.annee, l.mois))}
                </td>
                <td className="p-2 text-right tabular-nums">
                  {formatMontant(l.montantSource)}
                </td>
                <td className="p-2 text-right tabular-nums">
                  {formatMontant(l.montantReforecast)}
                </td>
                <td
                  className={`p-2 text-right tabular-nums ${l.ecart < 0 ? 'text-red-700' : l.ecart > 0 ? 'text-green-700' : 'text-(--muted-foreground)'}`}
                >
                  {l.ecart === 0
                    ? '—'
                    : (l.ecart > 0 ? '+' : '') + formatMontant(l.ecart)}
                </td>
                <td
                  className={`p-2 text-right tabular-nums ${l.ecart < 0 ? 'text-red-700' : l.ecart > 0 ? 'text-green-700' : 'text-(--muted-foreground)'}`}
                >
                  {l.ecart === 0 ? '—' : formatPct(l.ecart, l.montantSource)}
                </td>
                <td className="p-2">
                  <OrigineBadge origine={l.origine} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
