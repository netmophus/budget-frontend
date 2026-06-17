/**
 * LignesSaisiesTable — tableau récapitulatif des lignes déjà saisies
 * pour le contexte courant (Version × Scénario × CR × Ligne métier),
 * avec actions par ligne (modifier / supprimer), pagination et un
 * bloc d'indicateurs de synthèse (PNB).
 *
 * Source des données : les `lignes` de la grille (GET /budget/grille)
 * filtrées sur celles réellement saisies. Le montant annuel affiché
 * est la somme des 12 mois (`totalAnnee`) — le stockage reste mensuel.
 *
 * Le « mode » (annuel / mensuel) n'est PAS persisté en base : il est
 * *déduit* (12 montants uniformes au reliquat d'arrondi près ⇒ annuel).
 */
import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { GrilleLigne } from '@/lib/api/budget-grille';

const FMT = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const JUSTIF_EXTRAIT = 48;

export interface LigneSaisieKey {
  compteId: string;
  ligneMetierId: string;
}

interface LignesSaisiesTableProps {
  lignes: GrilleLigne[];
  /** 12 clés YYYY-MM-01 (ordre chronologique) pour déduire le mode. */
  moisKeys: string[];
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onModifier: (ligne: GrilleLigne) => void;
  onSupprimer: (ligne: GrilleLigne) => void;
  readOnly: boolean;
  /** Ligne actuellement en cours d'édition (surlignée). */
  editingKey: LigneSaisieKey | null;
}

/** Déduit le mode de saisie : annuel si les 11 premiers mois sont égaux. */
function deduireMode(ligne: GrilleLigne, moisKeys: string[]): 'annuel' | 'mensuel' {
  const parMois = new Map(ligne.cellules.map((c) => [c.mois, c.montant]));
  const vals = moisKeys.map((m) => parMois.get(m) ?? 0);
  if (vals.length < 12) return 'mensuel';
  const base = vals[0];
  const uniforme = vals.slice(0, 11).every((v) => v === base);
  return uniforme ? 'annuel' : 'mensuel';
}

function extraitJustification(ligne: GrilleLigne): string {
  const commentaire =
    ligne.cellules.find((c) => c.commentaire && c.commentaire.trim())
      ?.commentaire ?? '';
  if (commentaire.length <= JUSTIF_EXTRAIT) return commentaire;
  return `${commentaire.slice(0, JUSTIF_EXTRAIT)}…`;
}

export function LignesSaisiesTable({
  lignes,
  moisKeys,
  page,
  limit,
  onPageChange,
  onLimitChange,
  onModifier,
  onSupprimer,
  readOnly,
  editingKey,
}: LignesSaisiesTableProps): JSX.Element {
  const total = lignes.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageClamped = Math.min(page, totalPages - 1);
  const debut = pageClamped * limit;
  const pageLignes = lignes.slice(debut, debut + limit);

  // ─── Indicateurs de synthèse (PNB) ───────────────────────────────
  const totalProduits = lignes
    .filter((l) => l.compte.classe === '7')
    .reduce((s, l) => s + l.totalAnnee, 0);
  const totalCharges = lignes
    .filter((l) => l.compte.classe === '6')
    .reduce((s, l) => s + l.totalAnnee, 0);
  const pnb = totalProduits - totalCharges;

  if (total === 0) {
    return (
      <div
        className="bg-white border border-dashed border-(--border) rounded-lg py-8 px-6 text-center text-sm text-(--muted-foreground)"
        data-testid="lignes-saisies-vide"
      >
        Aucune ligne saisie pour ce contexte. Saisissez un compte ci-dessus.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="lignes-saisies">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold m-0">
          Lignes saisies{' '}
          <span className="text-(--muted-foreground) font-normal">
            ({total})
          </span>
        </h4>
        <label className="text-xs text-(--muted-foreground) flex items-center gap-1.5">
          Lignes / page
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            data-testid="lignes-saisies-pagesize"
            className="h-8 rounded-md border border-(--border) bg-white px-2 text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </label>
      </div>

      <div className="rounded-md border border-(--border) overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">N°</TableHead>
              <TableHead>Compte</TableHead>
              <TableHead>Libellé compte</TableHead>
              <TableHead>Ligne métier</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className="text-right">Montant annuel</TableHead>
              <TableHead>Justification</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageLignes.map((ligne, i) => {
              const mode = deduireMode(ligne, moisKeys);
              const enEdition =
                editingKey?.compteId === ligne.compte.id &&
                editingKey?.ligneMetierId === ligne.ligneMetier.id;
              return (
                <TableRow
                  key={`${ligne.compte.id}-${ligne.ligneMetier.id}`}
                  data-testid="ligne-saisie-row"
                  className={enEdition ? 'bg-(--miznas-bleu-nuit-dark)/5' : ''}
                >
                  <TableCell className="text-(--muted-foreground) tabular-nums">
                    {debut + i + 1}
                  </TableCell>
                  <TableCell className="font-mono">
                    {ligne.compte.codeCompte}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate">
                    {ligne.compte.libelle}
                  </TableCell>
                  <TableCell>{ligne.ligneMetier.codeLigneMetier}</TableCell>
                  <TableCell>
                    <span
                      title="Mode déduit (non persisté) : 12 montants uniformes ⇒ annuel"
                      className="inline-flex items-center rounded-sm bg-(--secondary) px-1.5 py-0.5 text-[11px] capitalize"
                    >
                      {mode}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {FMT.format(ligne.totalAnnee)}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-(--muted-foreground)">
                    {extraitJustification(ligne) || '—'}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      disabled={readOnly}
                      onClick={() => onModifier(ligne)}
                      data-testid="ligne-saisie-modifier"
                      title="Modifier la ligne"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-(--destructive)"
                      disabled={readOnly}
                      onClick={() => onSupprimer(ligne)}
                      data-testid="ligne-saisie-supprimer"
                      title="Supprimer la ligne"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <span className="text-(--muted-foreground)">
            Page {pageClamped + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={pageClamped <= 0}
            onClick={() => onPageChange(pageClamped - 1)}
            data-testid="lignes-saisies-prev"
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={pageClamped >= totalPages - 1}
            onClick={() => onPageChange(pageClamped + 1)}
            data-testid="lignes-saisies-next"
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Indicateurs de synthèse */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        data-testid="lignes-saisies-synthese"
      >
        <div className="rounded-md border border-(--border) bg-(--secondary) px-3 py-2">
          <div className="text-[11px] text-(--muted-foreground)">
            Lignes saisies
          </div>
          <div className="text-base font-semibold tabular-nums">{total}</div>
        </div>
        <div className="rounded-md border border-(--border) bg-(--secondary) px-3 py-2">
          <div className="text-[11px] text-(--muted-foreground)">
            Produits (classe 7)
          </div>
          <div
            className="text-base font-semibold tabular-nums"
            data-testid="synthese-produits"
          >
            {FMT.format(totalProduits)}
          </div>
        </div>
        <div className="rounded-md border border-(--border) bg-(--secondary) px-3 py-2">
          <div className="text-[11px] text-(--muted-foreground)">
            Charges (classe 6)
          </div>
          <div
            className="text-base font-semibold tabular-nums"
            data-testid="synthese-charges"
          >
            {FMT.format(totalCharges)}
          </div>
        </div>
        <div className="rounded-md border border-(--miznas-bleu-nuit-dark)/30 bg-(--miznas-bleu-nuit-dark)/5 px-3 py-2">
          <div className="text-[11px] text-(--muted-foreground)">
            Contribution au PNB
          </div>
          <div
            className="text-base font-semibold tabular-nums"
            data-testid="synthese-pnb"
          >
            {FMT.format(pnb)}
          </div>
        </div>
      </div>
    </div>
  );
}
