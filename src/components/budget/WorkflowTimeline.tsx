/**
 * Composant WorkflowTimeline (Lot 3.5) — visualisation chronologique
 * de l'historique d'une version budgétaire à partir des champs portés
 * par DimVersion (4 commentaires + 6 traces date/utilisateur).
 *
 * Étapes affichées (dans l'ordre du cycle nominal) :
 *   1. Création                 (toujours présente)
 *   2. Rejet                    (si dateRejet — précède la re-soumission)
 *   3. Soumission               (si dateSoumission)
 *   4. Validation               (si dateValidation)
 *   5. Publication / Gel        (si dateGel)
 *
 * Chaque étape rendue affiche : icône statut, libellé, date FR,
 * utilisateur, commentaire associé (si présent).
 *
 * Vocabulaire UI (cf. docs/modele-donnees.md §4.1.2) :
 *   - statut 'gele' s'affiche « Publié »
 */
import {
  CheckCircle2,
  Circle,
  FilePlus,
  Lock,
  Send,
  XCircle,
} from 'lucide-react';

import { type Version } from '@/lib/api/versions';
import { formatDateFr } from '@/lib/labels/budget';

interface Step {
  key: string;
  label: string;
  date: string;
  utilisateur: string | null;
  commentaire: string | null;
  Icon: typeof Circle;
  iconClass: string;
}

function buildSteps(version: Version): Step[] {
  const steps: Step[] = [];
  steps.push({
    key: 'creation',
    label: 'Création',
    date: version.dateCreation,
    utilisateur: version.utilisateurCreation,
    commentaire: version.commentaire,
    Icon: FilePlus,
    iconClass: 'text-gray-500',
  });
  if (version.dateRejet) {
    steps.push({
      key: 'rejet',
      label: 'Rejet',
      date: version.dateRejet,
      utilisateur: version.utilisateurRejet,
      commentaire: version.commentaireRejet,
      Icon: XCircle,
      iconClass: 'text-red-600',
    });
  }
  if (version.dateSoumission) {
    steps.push({
      key: 'soumission',
      label: 'Soumission à validation',
      date: version.dateSoumission,
      utilisateur: version.utilisateurSoumission,
      commentaire: version.commentaireSoumission,
      Icon: Send,
      iconClass: 'text-orange-500',
    });
  }
  if (version.dateValidation) {
    steps.push({
      key: 'validation',
      label: 'Validation',
      date: version.dateValidation,
      utilisateur: version.utilisateurValidation,
      commentaire: version.commentaireValidation,
      Icon: CheckCircle2,
      iconClass: 'text-blue-500',
    });
  }
  if (version.dateGel) {
    steps.push({
      key: 'publication',
      label: 'Publication (gel BCEAO)',
      date: version.dateGel,
      utilisateur: version.utilisateurGel,
      commentaire: version.commentairePublication,
      Icon: Lock,
      iconClass: 'text-green-600',
    });
  }
  // Ordre chronologique strict (les dates ci-dessus peuvent se croiser
  // dans le cas rejet → re-soumission).
  return steps.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

interface WorkflowTimelineProps {
  version: Version;
}

export function WorkflowTimeline({
  version,
}: WorkflowTimelineProps): JSX.Element {
  const steps = buildSteps(version);

  return (
    <ol
      className="relative border-l border-(--border) pl-6 space-y-4"
      data-testid="workflow-timeline"
    >
      {steps.map((step) => (
        <li key={step.key} className="relative" data-testid={`step-${step.key}`}>
          <span
            className={`absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-(--background) ${step.iconClass}`}
          >
            <step.Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="text-sm">
            <p className="font-medium">{step.label}</p>
            <p className="text-xs text-(--muted-foreground)">
              {formatDateFr(step.date)}
              {step.utilisateur ? ` · ${step.utilisateur}` : ''}
            </p>
            {step.commentaire && (
              <p className="mt-1 whitespace-pre-wrap rounded bg-(--muted) px-2 py-1 text-xs">
                {step.commentaire}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
