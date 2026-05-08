/**
 * Badges réutilisables pour le module reforecast (Lot 5.3.B).
 */
import { Badge } from '@/components/ui/badge';
import {
  type MethodeExtrapolation,
  type OrigineLigne,
  type StatutPublicationReforecast,
  type StatutWorkflow,
  METHODE_LABEL,
  ORIGINE_LABEL,
  STATUT_WORKFLOW_LABEL,
} from '@/lib/api/reforecast';

const STATUT_WF_CLASSES: Record<StatutWorkflow, string> = {
  ouvert: 'bg-slate-200 text-slate-800',
  soumis: 'bg-blue-100 text-blue-800',
  valide: 'bg-violet-100 text-violet-800',
  gele: 'bg-green-100 text-green-800',
};

export function StatutWorkflowBadge({
  statut,
}: {
  statut: StatutWorkflow;
}): JSX.Element {
  return (
    <Badge
      variant="secondary"
      className={STATUT_WF_CLASSES[statut]}
      data-testid={`badge-statut-wf-${statut}`}
    >
      {STATUT_WORKFLOW_LABEL[statut]}
    </Badge>
  );
}

export function StatutPublicationBadge({
  statut,
  remplaceParCode,
}: {
  statut: StatutPublicationReforecast;
  remplaceParCode?: string | null;
}): JSX.Element {
  if (statut === 'OBSOLETE') {
    const tooltip = remplaceParCode
      ? `Remplacé par : ${remplaceParCode}`
      : 'Obsolète';
    return (
      <Badge
        variant="secondary"
        className="bg-(--muted) text-(--muted-foreground) line-through"
        title={tooltip}
        data-testid="badge-statut-pub-obsolete"
      >
        OBSOLETE
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="bg-green-50 text-green-800"
      data-testid="badge-statut-pub-active"
    >
      ACTIVE
    </Badge>
  );
}

const METHODE_CLASSES: Record<MethodeExtrapolation, string> = {
  MOYENNE_TRIMESTRE: 'bg-amber-100 text-amber-800',
  BUDGET_INITIAL: 'bg-sky-100 text-sky-800',
  MANUELLE: 'bg-orange-100 text-orange-800',
};

export function MethodeBadge({
  methode,
}: {
  methode: MethodeExtrapolation;
}): JSX.Element {
  return (
    <Badge
      variant="secondary"
      className={METHODE_CLASSES[methode]}
      data-testid={`badge-methode-${methode}`}
    >
      {METHODE_LABEL[methode]}
    </Badge>
  );
}

export function TrimestreBadge({
  trimestre,
  annee,
}: {
  trimestre: number;
  annee: number;
}): JSX.Element {
  return (
    <Badge
      variant="secondary"
      className="bg-(--muted) text-(--foreground)"
      data-testid="badge-trimestre"
    >
      T{trimestre} {annee}
    </Badge>
  );
}

const ORIGINE_CLASSES: Record<OrigineLigne, string> = {
  REALISE: 'bg-green-100 text-green-800',
  EXTRAPOLATION: 'bg-blue-100 text-blue-800',
  MANUEL: 'bg-orange-100 text-orange-800',
};

const ORIGINE_DESCRIPTIONS: Record<OrigineLigne, string> = {
  REALISE:
    'Mois compris dans le trimestre consolidé : montant repris du fait_realise validé.',
  EXTRAPOLATION:
    'Mois après le trimestre consolidé : montant calculé selon la méthode d\'extrapolation.',
  MANUEL: 'Mois après le trimestre consolidé : montant à saisir manuellement.',
};

export function OrigineBadge({
  origine,
}: {
  origine: OrigineLigne;
}): JSX.Element {
  return (
    <Badge
      variant="secondary"
      className={`${ORIGINE_CLASSES[origine]} text-xs`}
      title={ORIGINE_DESCRIPTIONS[origine]}
      data-testid={`badge-origine-${origine}`}
    >
      {ORIGINE_LABEL[origine].toUpperCase()}
    </Badge>
  );
}
