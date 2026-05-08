/**
 * En-tête de la page détail reforecast (Lot 5.3.B). Affiche
 * libellé + métadonnées + bandeau OBSOLETE si applicable.
 */
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { type Reforecast } from '@/lib/api/reforecast';
import {
  MethodeBadge,
  StatutPublicationBadge,
  StatutWorkflowBadge,
  TrimestreBadge,
} from './ReforecastBadges';
import { ReforecastWorkflowButtons } from './ReforecastWorkflowButtons';

interface Props {
  reforecast: Reforecast;
  remplacant?: Reforecast | null;
  onTransitioned: () => void;
}

export function ReforecastHeader({
  reforecast,
  remplacant,
  onTransitioned,
}: Props): JSX.Element {
  return (
    <div className="space-y-3 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            to="/reforecast"
            className="text-xs text-(--muted-foreground) hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Liste des reforecasts
          </Link>
          <h1 className="text-2xl font-bold mt-1">{reforecast.libelle}</h1>
          <p className="text-xs font-mono text-(--muted-foreground)">
            {reforecast.codeVersion}
          </p>
          <div className="flex flex-wrap gap-2 mt-2 items-center text-xs text-(--muted-foreground)">
            <TrimestreBadge
              trimestre={reforecast.trimestreConsolide}
              annee={reforecast.anneeConsolide}
            />
            <MethodeBadge methode={reforecast.methodeExtrapolation} />
            <StatutWorkflowBadge statut={reforecast.statut} />
            <StatutPublicationBadge
              statut={reforecast.statutPublication}
              remplaceParCode={remplacant?.codeVersion}
            />
            <span>·</span>
            <span>
              Source :{' '}
              <strong>
                {reforecast.libelleVersionSource ?? '—'} /{' '}
                {reforecast.libelleScenarioSource ?? '—'}
              </strong>
            </span>
          </div>
        </div>
        <div>
          <ReforecastWorkflowButtons
            reforecast={reforecast}
            onTransitioned={onTransitioned}
          />
        </div>
      </div>

      {reforecast.statutPublication === 'OBSOLETE' && (
        <div
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 flex gap-2"
          data-testid="rf-banner-obsolete"
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">
              Ce reforecast est marqué OBSOLETE
              {reforecast.dateObsolescence
                ? ` depuis le ${new Date(reforecast.dateObsolescence).toLocaleDateString('fr-FR')}`
                : ''}
              .
            </p>
            {remplacant ? (
              <p className="mt-1">
                Il a été remplacé par{' '}
                <Link
                  to={`/reforecast/${remplacant.id}`}
                  className="underline font-medium"
                  data-testid="rf-link-remplacant"
                >
                  {remplacant.libelle} ({remplacant.codeVersion})
                </Link>
                . Plus de modifications possibles.
              </p>
            ) : (
              <p className="mt-1">
                Plus de modifications possibles. La version remplaçante n'est
                pas accessible.
              </p>
            )}
          </div>
        </div>
      )}

      {reforecast.statutPublication === 'ACTIVE' &&
        reforecast.statut === 'gele' && (
          <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900">
            <p>
              Reforecast <strong>publié</strong> et actif. Cette version est
              IMMUABLE.
            </p>
          </div>
        )}

      <Button variant="ghost" size="sm" asChild className="hidden">
        {/* trick pour conserver Button utilisé si on veut ajouter d'autres actions */}
        <span />
      </Button>
    </div>
  );
}
