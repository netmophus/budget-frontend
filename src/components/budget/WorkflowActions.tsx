/**
 * Composant WorkflowActions (Lot 3.5) — boutons d'action du workflow
 * de validation budgétaire selon le statut courant et les permissions
 * de l'utilisateur connecté.
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
 * Le rejet exige un commentaire (modal dédié — backend renvoie 400 sinon).
 * Les autres actions ouvrent une modal de confirmation avec champ
 * commentaire optionnel.
 */
import { AxiosError } from 'axios';
import { CheckCircle2, Lock, Send, ThumbsUp, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  publierVersion,
  rejeterVersion,
  soumettreVersion,
  validerVersion,
  type Version,
} from '@/lib/api/versions';
import { useHasPermission } from '@/lib/auth/permissions';

type Action = 'soumettre' | 'valider' | 'rejeter' | 'publier';

interface ActionConfig {
  title: string;
  description: string;
  confirmLabel: string;
  variant: 'default' | 'destructive' | 'outline';
  commentaireRequired: boolean;
  commentairePlaceholder: string;
}

const ACTION_CONFIG: Record<Action, ActionConfig> = {
  soumettre: {
    title: 'Soumettre à validation',
    description:
      'La version Brouillon sera transmise au contrôleur pour vérification. ' +
      'Vous ne pourrez plus modifier les lignes tant qu’elle reste « Soumis ».',
    confirmLabel: 'Soumettre',
    variant: 'default',
    commentaireRequired: false,
    commentairePlaceholder: 'Note pour le contrôleur (facultatif)',
  },
  valider: {
    title: 'Valider la version',
    description:
      'La version sera marquée « Validée ». Le directeur pourra ensuite la publier.',
    confirmLabel: 'Valider',
    variant: 'default',
    commentaireRequired: false,
    commentairePlaceholder: 'Commentaire de validation (facultatif)',
  },
  rejeter: {
    title: 'Rejeter la version',
    description:
      'La version repassera en « Brouillon » et le préparateur devra corriger ' +
      'avant de re-soumettre. Un commentaire de rejet est obligatoire.',
    confirmLabel: 'Rejeter',
    variant: 'destructive',
    commentaireRequired: true,
    commentairePlaceholder: 'Motif du rejet (obligatoire)',
  },
  publier: {
    title: 'Publier (gel) la version',
    description:
      'Action IRRÉVERSIBLE — la version deviendra immuable et sera ' +
      'archivée 10 ans (conservation BCEAO). Aucune modification ' +
      'ultérieure ne sera possible.',
    confirmLabel: 'Publier',
    variant: 'destructive',
    commentaireRequired: false,
    commentairePlaceholder: 'Note de publication (facultatif)',
  },
};

function parseApiError(err: unknown): { status: number; message: string } {
  if (err instanceof AxiosError) {
    const status = err.response?.status ?? 0;
    const dataMsg =
      (err.response?.data as { message?: string | string[] } | undefined)
        ?.message;
    const message = Array.isArray(dataMsg)
      ? dataMsg.join(' ; ')
      : (dataMsg ?? err.message);
    return { status, message };
  }
  return {
    status: 0,
    message: err instanceof Error ? err.message : 'Erreur',
  };
}

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

  const [open, setOpen] = useState<Action | null>(null);
  const [commentaire, setCommentaire] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function openAction(a: Action): void {
    setCommentaire('');
    setOpen(a);
  }

  function closeAction(): void {
    if (submitting) return;
    setOpen(null);
    setCommentaire('');
  }

  async function handleConfirm(): Promise<void> {
    if (!open) return;
    const config = ACTION_CONFIG[open];
    const trimmed = commentaire.trim();
    if (config.commentaireRequired && !trimmed) {
      toast.error('Le commentaire de rejet est obligatoire.');
      return;
    }
    setSubmitting(true);
    try {
      let next: Version;
      switch (open) {
        case 'soumettre':
          next = await soumettreVersion(version.id, {
            commentaire: trimmed || undefined,
          });
          toast.success(`Version ${version.codeVersion} soumise à validation.`);
          break;
        case 'valider':
          next = await validerVersion(version.id, {
            commentaire: trimmed || undefined,
          });
          toast.success(`Version ${version.codeVersion} validée.`);
          break;
        case 'rejeter':
          next = await rejeterVersion(version.id, { commentaire: trimmed });
          toast.success(
            `Version ${version.codeVersion} rejetée — retour au préparateur.`,
          );
          break;
        case 'publier':
          next = await publierVersion(version.id, {
            commentaire: trimmed || undefined,
          });
          toast.success(`Version ${version.codeVersion} publiée (gel BCEAO).`);
          break;
      }
      setOpen(null);
      setCommentaire('');
      onTransitioned(next);
    } catch (err) {
      const { status, message } = parseApiError(err);
      if (status === 422) {
        toast.error(
          message ||
            'Cette version est vide — saisissez au moins une ligne avant de la soumettre.',
        );
      } else if (status === 409) {
        toast.error(message || 'Statut incompatible avec cette transition.');
      } else if (status === 403) {
        toast.error('Permission refusée.');
      } else if (status === 400) {
        toast.error(message || 'Le commentaire de rejet est obligatoire.');
      } else {
        toast.error(message || 'Échec de la transition.');
      }
    } finally {
      setSubmitting(false);
    }
  }

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
        onClick={() => openAction('soumettre')}
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
        onClick={() => openAction('valider')}
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
        onClick={() => openAction('rejeter')}
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
        onClick={() => openAction('publier')}
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

  const config = open ? ACTION_CONFIG[open] : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">{buttons}</div>

      <Dialog
        open={open !== null}
        onOpenChange={(o) => !o && closeAction()}
      >
        {config && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{config.title}</DialogTitle>
              <DialogDescription>{config.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              <Label htmlFor="workflow-commentaire">
                Commentaire
                {config.commentaireRequired && (
                  <span className="text-red-600 ml-0.5">*</span>
                )}
              </Label>
              <textarea
                id="workflow-commentaire"
                rows={4}
                maxLength={2000}
                placeholder={config.commentairePlaceholder}
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                className="w-full rounded-md border border-(--input) bg-(--background) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--ring) resize-y"
                data-testid="workflow-commentaire"
              />
              <p className="text-xs text-(--muted-foreground)">
                {commentaire.length} / 2000 caractères
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeAction}
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button
                variant={config.variant}
                onClick={handleConfirm}
                disabled={
                  submitting ||
                  (config.commentaireRequired && !commentaire.trim())
                }
                data-testid="workflow-confirmer"
              >
                {submitting ? 'En cours…' : config.confirmLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
