/**
 * Tableau principal de la page liste reforecasts (Lot 5.3.B +
 * refonte Lot 7.3 V25 Charte v1).
 *
 * Refonte V25 :
 *  - Grid CSS modernisé bg-white border + header gris uppercase
 *    + lignes hover --muted/30 + last:border-b-0
 *  - Statut FUSIONNÉ : workflow badge (StatutWorkflowBadge) +
 *    publication pastille (StatutPublicationBadge) sur 2 lignes
 *  - Code mono truncate avec title pour codes longs
 *  - Source sur 2 lignes : libelleVersionSource + libelleScenarioSource
 *  - Trimestre badge, Méthode badge réutilisés (ReforecastBadges)
 *  - Date tabular-nums mono, auteur xs muted
 *  - Action : DropdownMenu inchangé (data-testid rf-actions-${id}
 *    préservé)
 *  - data-testid critiques préservés : rf-liste-table /
 *    rf-row-${id} / rf-actions-${id} / rf-liste-empty + délégation
 *    aux badges (badge-statut-pub-obsolete via
 *    StatutPublicationBadge intact).
 */
import { Eye, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type Reforecast } from '@/lib/api/reforecast';
import {
  MethodeBadge,
  StatutPublicationBadge,
  StatutWorkflowBadge,
  TrimestreBadge,
} from './ReforecastBadges';

interface Props {
  liste: Reforecast[];
  /**
   * Map id_reforecast → libellé du remplaçant (pour le tooltip
   * OBSOLETE). Calculé en amont par la page.
   */
  remplacantParId?: Record<string, string>;
}

function formatDate(d: string): string {
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}/${date.getFullYear()}`;
}

const COLS =
  'grid grid-cols-[230px_1fr_140px_140px_180px_110px_140px_60px] gap-2 items-center';

export function ReforecastListeTable({
  liste,
  remplacantParId = {},
}: Props): JSX.Element {
  if (liste.length === 0) {
    return (
      <p
        className="text-sm text-(--muted-foreground)"
        data-testid="rf-liste-empty"
      >
        Aucun reforecast à afficher.
      </p>
    );
  }

  return (
    <div
      className="bg-white border border-(--border) rounded-md overflow-hidden"
      data-testid="rf-liste-table"
    >
      <div
        className={`${COLS} bg-(--secondary) px-3.5 py-2.5 border-b border-(--border)`}
      >
        <ColumnHeader>Code</ColumnHeader>
        <ColumnHeader>Libellé / Source</ColumnHeader>
        <ColumnHeader>Trim.</ColumnHeader>
        <ColumnHeader>Méthode</ColumnHeader>
        <ColumnHeader>Statut</ColumnHeader>
        <ColumnHeader>Créé le</ColumnHeader>
        <ColumnHeader>Auteur</ColumnHeader>
        <ColumnHeader>Act.</ColumnHeader>
      </div>

      {liste.map((rf) => (
        <div
          key={rf.id}
          className={`${COLS} px-3.5 py-3 border-b border-(--border) last:border-b-0 hover:bg-(--muted)/30 transition-colors`}
          data-testid={`rf-row-${rf.id}`}
        >
          <div
            className="font-mono text-[11px] truncate pr-1"
            title={rf.codeVersion}
          >
            {rf.codeVersion}
          </div>

          <div className="min-w-0">
            <div className="text-[13px] font-medium truncate">
              {rf.libelle}
            </div>
            <div className="text-[11px] text-(--muted-foreground) leading-snug truncate">
              <span className="font-mono">
                {rf.libelleVersionSource ?? '—'}
              </span>
              <span className="mx-1">·</span>
              <span>{rf.libelleScenarioSource ?? '—'}</span>
            </div>
          </div>

          <div>
            <TrimestreBadge
              trimestre={rf.trimestreConsolide}
              annee={rf.anneeConsolide}
            />
          </div>

          <div>
            <MethodeBadge methode={rf.methodeExtrapolation} />
          </div>

          <div className="flex flex-col gap-0.5 items-start">
            <StatutWorkflowBadge statut={rf.statut} />
            <StatutPublicationBadge
              statut={rf.statutPublication}
              remplaceParCode={remplacantParId[rf.id]}
            />
          </div>

          <div className="text-xs text-(--muted-foreground) tabular-nums font-mono">
            {formatDate(rf.dateCreation)}
          </div>

          <div
            className="text-[11px] text-(--muted-foreground) truncate"
            title={rf.utilisateurCreation}
          >
            {rf.utilisateurCreation}
          </div>

          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  data-testid={`rf-actions-${rf.id}`}
                  aria-label="Actions"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={`/reforecast/${rf.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Voir détail
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}

function ColumnHeader({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
      {children}
    </div>
  );
}
