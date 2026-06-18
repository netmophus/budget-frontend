/**
 * ProgressionVersionTable — tableau des CR du snapshot d'une version
 * (vue Coordinateur / Comité, tous CR confondus, sans filtre périmètre).
 * Colonnes : Code CR · Libellé · Saisisseur · Statut · PNB · Actions.
 */
import { StatutCrBadge } from '@/components/budget/cr-workflow/StatutCrBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CrStatutLigne } from '@/lib/api/cr-workflow';

const FMT = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

interface ProgressionVersionTableProps {
  crs: CrStatutLigne[];
  /** Actions par ligne (retirer / détail). Colonne masquée si absent. */
  renderActions?: (cr: CrStatutLigne) => JSX.Element | null;
  /** Clic sur une ligne (ex. ouvrir le détail CR — Comité). */
  onRowClick?: (cr: CrStatutLigne) => void;
}

export function ProgressionVersionTable({
  crs,
  renderActions,
  onRowClick,
}: ProgressionVersionTableProps): JSX.Element {
  return (
    <div className="rounded-md border border-(--border) overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">N°</TableHead>
            <TableHead>Code CR</TableHead>
            <TableHead>Libellé</TableHead>
            <TableHead>Saisisseur</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">PNB</TableHead>
            {renderActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {crs.map((cr, i) => (
            <TableRow
              key={cr.crId}
              data-testid="progression-row"
              className={onRowClick ? 'cursor-pointer' : ''}
              onClick={onRowClick ? () => onRowClick(cr) : undefined}
            >
              <TableCell className="text-(--muted-foreground) tabular-nums">
                {i + 1}
              </TableCell>
              <TableCell className="font-mono">{cr.crCode}</TableCell>
              <TableCell className="max-w-[180px] truncate">
                {cr.libelle}
              </TableCell>
              <TableCell className="max-w-[180px] truncate text-(--muted-foreground)">
                {cr.saisisseurEmail ?? '—'}
              </TableCell>
              <TableCell>
                <StatutCrBadge statut={cr.statut} />
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {FMT.format(cr.pnb)}
              </TableCell>
              {renderActions && (
                <TableCell
                  className="text-right whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  {renderActions(cr)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
