/**
 * Onglet Grille de la page détail reforecast (Lot 5.3.B).
 *
 * Affichage en lecture seule des lignes fait_budget du reforecast
 * avec la colonne « Origine » (REALISE / EXTRAPOLATION / MANUEL).
 * Pour l'édition, l'utilisateur est redirigé vers la page
 * `/budget/saisie` qui réutilise `GrilleSaisie` (Lot 3.4) — le
 * wrapper complet édité-en-place est laissé à un Lot ultérieur
 * (cf. dette §dette dans docs/lot-5/5.3-reforecast.md).
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  type ComparaisonResponse,
  type LigneComparaison,
  type Reforecast,
  getReforecastComparaison,
} from '@/lib/api/reforecast';
import { formaterMois } from '@/lib/format/mois';
import { OrigineBadge } from './ReforecastBadges';

interface Props {
  reforecast: Reforecast;
}

function formatMontant(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function moisYM(annee: number, mois: number): string {
  return `${annee}-${String(mois).padStart(2, '0')}`;
}

interface CelluleAffichee {
  ligneCle: string;
  codeCr: string;
  codeCompte: string;
  codeLigneMetier: string;
  fk_temps: string;
  mois: number;
  annee: number;
  montant: number;
  origine: LigneComparaison['origine'];
}

export function ReforecastGrille({ reforecast }: Props): JSX.Element {
  const [data, setData] = useState<ComparaisonResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // On réutilise l'endpoint comparaison qui contient déjà le détail
    // ligne à ligne avec l'origine. Pas besoin d'un endpoint dédié.
    getReforecastComparaison(reforecast.id)
      .then((r) => setData(r))
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Erreur';
        toast.error(`Chargement grille : ${msg}`);
      })
      .finally(() => setLoading(false));
  }, [reforecast.id]);

  // Pivote les lignes en (CR × compte × ligne_metier) → mois → montant
  const matrice = useMemo<{
    rows: Array<{
      cle: string;
      codeCr: string;
      codeCompte: string;
      codeLigneMetier: string;
      cellules: CelluleAffichee[]; // 12 cellules ordonnées par mois
    }>;
    moisLabels: string[];
  }>(() => {
    if (!data) return { rows: [], moisLabels: [] };
    const groupes = new Map<string, CelluleAffichee[]>();
    for (const l of data.lignes) {
      const cle = `${l.codeCr}|${l.codeCompte}|${l.codeLigneMetier}`;
      if (!groupes.has(cle)) groupes.set(cle, []);
      groupes.get(cle)!.push({
        ligneCle: cle,
        codeCr: l.codeCr,
        codeCompte: l.codeCompte,
        codeLigneMetier: l.codeLigneMetier,
        fk_temps: l.fkTemps,
        mois: l.mois,
        annee: l.annee,
        montant: l.montantReforecast,
        origine: l.origine,
      });
    }
    const moisSet = new Set<number>();
    for (const cells of groupes.values()) {
      for (const c of cells) moisSet.add(c.mois);
    }
    const moisOrdonnes = Array.from(moisSet).sort((a, b) => a - b);
    const annee = data.lignes[0]?.annee ?? reforecast.anneeConsolide;
    const moisLabels = moisOrdonnes.map((m) => formaterMois(moisYM(annee, m)));

    const rows = Array.from(groupes.entries()).map(([cle, cells]) => {
      const cellByMois = new Map(cells.map((c) => [c.mois, c]));
      const ordered = moisOrdonnes.map(
        (m) =>
          cellByMois.get(m) ?? {
            ligneCle: cle,
            codeCr: cells[0]!.codeCr,
            codeCompte: cells[0]!.codeCompte,
            codeLigneMetier: cells[0]!.codeLigneMetier,
            fk_temps: '',
            mois: m,
            annee,
            montant: 0,
            origine: 'EXTRAPOLATION' as const,
          },
      );
      return {
        cle,
        codeCr: cells[0]!.codeCr,
        codeCompte: cells[0]!.codeCompte,
        codeLigneMetier: cells[0]!.codeLigneMetier,
        cellules: ordered,
      };
    });
    rows.sort((a, b) => {
      if (a.codeCr !== b.codeCr) return a.codeCr.localeCompare(b.codeCr);
      return a.codeCompte.localeCompare(b.codeCompte);
    });
    return { rows, moisLabels };
  }, [data, reforecast.anneeConsolide]);

  if (loading) {
    return (
      <p className="text-sm text-(--muted-foreground)">
        Chargement de la grille…
      </p>
    );
  }

  if (!data || matrice.rows.length === 0) {
    return (
      <p
        className="text-sm text-(--muted-foreground)"
        data-testid="rf-grille-empty"
      >
        Aucune ligne dans ce reforecast.
      </p>
    );
  }

  const editable =
    reforecast.statut === 'ouvert' &&
    reforecast.statutPublication === 'ACTIVE';

  return (
    <div className="space-y-3" data-testid="rf-grille">
      {!editable && (
        <div
          className="rounded-md border border-(--border) bg-(--muted)/30 p-3 text-sm text-(--muted-foreground)"
          data-testid="rf-grille-readonly"
        >
          Lecture seule —{' '}
          {reforecast.statutPublication === 'OBSOLETE'
            ? 'reforecast OBSOLETE'
            : `statut "${reforecast.statut}" non éditable`}
          .
        </div>
      )}
      {editable && (
        <div className="flex justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to={`/budget/saisie?versionId=${reforecast.id}&scenarioId=${reforecast.fkScenarioSource}`}
              >
                <Button variant="outline" data-testid="rf-grille-edit-link">
                  Éditer ce reforecast
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              La saisie reforecast utilise la même grille que le budget.
              Vous serez redirigé vers la page de saisie filtrée sur ce
              reforecast.
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      <div className="overflow-x-auto">
        <table
          className="text-xs border-collapse"
          data-testid="rf-grille-table"
        >
          <thead>
            <tr className="border-b border-(--border) text-(--muted-foreground)">
              <th className="p-2 text-left sticky left-0 bg-(--background)">
                CR
              </th>
              <th className="p-2 text-left">Compte</th>
              <th className="p-2 text-left">Ligne métier</th>
              {matrice.moisLabels.map((m, i) => (
                <th key={i} className="p-2 text-right whitespace-nowrap">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrice.rows.map((r) => (
              <tr
                key={r.cle}
                className="border-b border-(--border)/50"
                data-testid={`rf-grille-row-${r.codeCr}-${r.codeCompte}`}
              >
                <td className="p-2 font-medium sticky left-0 bg-(--background)">
                  {r.codeCr}
                </td>
                <td className="p-2 font-medium">{r.codeCompte}</td>
                <td className="p-2">{r.codeLigneMetier}</td>
                {r.cellules.map((c, i) => (
                  <td
                    key={i}
                    className="p-2 text-right tabular-nums whitespace-nowrap"
                    data-testid={`rf-grille-cell-${r.codeCr}-${r.codeCompte}-${c.mois}`}
                  >
                    <div>{formatMontant(c.montant)}</div>
                    <div className="mt-1">
                      <OrigineBadge origine={c.origine} />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
