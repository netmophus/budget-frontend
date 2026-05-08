/**
 * Tableau principal de la page liste reforecasts (Lot 5.3.B).
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
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

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
    <table
      className="w-full text-sm border-collapse"
      data-testid="rf-liste-table"
    >
      <thead className="text-xs text-(--muted-foreground) border-b border-(--border)">
        <tr>
          <th className="text-left p-2">Code</th>
          <th className="text-left p-2">Libellé</th>
          <th className="text-left p-2">Source</th>
          <th className="text-left p-2">Trimestre</th>
          <th className="text-left p-2">Méthode</th>
          <th className="text-left p-2">Workflow</th>
          <th className="text-left p-2">Publication</th>
          <th className="text-left p-2">Créé le</th>
          <th className="text-left p-2">Auteur</th>
          <th className="text-right p-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {liste.map((rf) => (
          <tr
            key={rf.id}
            className="border-b border-(--border)/50 hover:bg-(--accent)/30"
            data-testid={`rf-row-${rf.id}`}
          >
            <td className="p-2 font-mono text-xs">
              {rf.codeVersion.length > 30
                ? `${rf.codeVersion.slice(0, 30)}…`
                : rf.codeVersion}
            </td>
            <td className="p-2 font-medium">{rf.libelle}</td>
            <td className="p-2 text-xs text-(--muted-foreground)">
              <div>{rf.libelleVersionSource ?? '—'}</div>
              <div>{rf.libelleScenarioSource ?? '—'}</div>
            </td>
            <td className="p-2">
              <TrimestreBadge
                trimestre={rf.trimestreConsolide}
                annee={rf.anneeConsolide}
              />
            </td>
            <td className="p-2">
              <MethodeBadge methode={rf.methodeExtrapolation} />
            </td>
            <td className="p-2">
              <StatutWorkflowBadge statut={rf.statut} />
            </td>
            <td className="p-2">
              <StatutPublicationBadge
                statut={rf.statutPublication}
                remplaceParCode={remplacantParId[rf.id]}
              />
            </td>
            <td className="p-2 whitespace-nowrap">
              {formatDate(rf.dateCreation)}
            </td>
            <td className="p-2 text-xs">{rf.utilisateurCreation}</td>
            <td className="p-2 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`rf-actions-${rf.id}`}
                  >
                    <MoreVertical className="h-4 w-4" />
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
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
