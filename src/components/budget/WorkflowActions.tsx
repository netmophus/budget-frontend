/**
 * Composant WorkflowActions (Lot 3.5, refactor Lot 7.3) — boutons
 * d'action du workflow de validation budgétaire selon le statut courant
 * et les permissions de l'utilisateur connecté.
 *
 * Vocabulaire UI ↔ DB (cf. docs/modele-donnees.md §4.1.2) :
 *   - Brouillon ↔ ouvert        - Validé   ↔ valide
 *   - Soumis    ↔ soumis        - Publié   ↔ gele
 *
 * Règles d'affichage :
 *   - statut 'ouvert'  → bouton « Soumettre à validation » si BUDGET.SOUMETTRE
 *   - statut 'soumis'  → boutons « Valider » + « Rejeter » si BUDGET.VALIDER
 *   - statut 'valide'  → bouton « Publier » si BUDGET.PUBLIER
 *   - statut 'gele'    → message « Action irréversible » (immuable)
 *
 * Lot 7.3 : la modale de confirmation (commentaire + appel API + toasts)
 * est extraite dans `<WorkflowActionDialog>`, réutilisable depuis les
 * pages qui veulent leurs propres boutons custom (cf.
 * VersionsAValiderPage).
 */
import { CheckCircle2, Lock, Send, ThumbsUp, XCircle } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { type Version } from '@/lib/api/versions';
import { useHasPermission } from '@/lib/auth/permissions';
import {
  WorkflowActionDialog,
  type WorkflowAction,
} from './WorkflowActionDialog';

interface WorkflowActionsProps {
  version: Version;
  /** Appelé après chaque transition réussie pour rafraîchir la donnée. */
  onTransitioned: (next: Version) => void;
}

export function WorkflowActions({
  version,
  onTransitioned,
}: WorkflowActionsProps): JSX.Element | null {
  const canSoumettre = useHasPermission('BUDGET.SOUMETTRE');
  const canValider = useHasPermission('BUDGET.VALIDER');
  const canPublier = useHasPermission('BUDGET.PUBLIER');

  const [open, setOpen] = useState<WorkflowAction | null>(null);

  // Statut Publié (gele) — immuable, on n'affiche aucun bouton mais
  // on rappelle la conservation BCEAO.
  if (version.statut === 'gele') {
    return (
      <div
        className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm"
        role="note"
        data-testid="workflow-immuable"
      >
        <Lock className="h-4 w-4 text-green-700 mt-0.5" />
        <span className="text-green-900">
          Version publiée — action irréversible. Aucune modification possible
          (conservation BCEAO 10 ans).
        </span>
      </div>
    );
  }

  const buttons: JSX.Element[] = [];
  if (version.statut === 'ouvert' && canSoumettre) {
    buttons.push(
      <Button
        key="soumettre"
        onClick={() => setOpen('soumettre')}
        data-testid="btn-soumettre"
      >
        <Send className="h-4 w-4 mr-2" />
        Soumettre à validation
      </Button>,
    );
  }
  if (version.statut === 'soumis' && canValider) {
    buttons.push(
      <Button
        key="valider"
        onClick={() => setOpen('valider')}
        data-testid="btn-valider"
      >
        <ThumbsUp className="h-4 w-4 mr-2" />
        Valider
      </Button>,
    );
    buttons.push(
      <Button
        key="rejeter"
        variant="destructive"
        onClick={() => setOpen('rejeter')}
        data-testid="btn-rejeter"
      >
        <XCircle className="h-4 w-4 mr-2" />
        Rejeter
      </Button>,
    );
  }
  if (version.statut === 'valide' && canPublier) {
    buttons.push(
      <Button
        key="publier"
        onClick={() => setOpen('publier')}
        data-testid="btn-publier"
      >
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Publier
      </Button>,
    );
  }

  if (buttons.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">{buttons}</div>

      <WorkflowActionDialog
        version={version}
        action={open}
        onClose={() => setOpen(null)}
        onTransitioned={(next) => {
          setOpen(null);
          onTransitioned(next);
        }}
      />
    </>
  );
}
