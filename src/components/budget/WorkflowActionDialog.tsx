/**
 * WorkflowActionDialog (Lot 7.3) — modale réutilisable pour confirmer
 * une transition workflow d'une version budgétaire.
 *
 * Extrait de `WorkflowActions` (Lot 3.5) pour pouvoir être déclenché
 * depuis n'importe quel jeu de boutons custom (page "Versions à
 * valider" Lot 7.3, etc.) sans dupliquer la logique d'appel API,
 * de validation côté client (commentaire de rejet obligatoire),
 * de mapping d'erreurs (422 / 409 / 403 / 400) et de toasts.
 *
 * WorkflowActions consomme ce composant en interne et expose une
 * surface inchangée pour les pages historiques (SaisieBudgetairePage,
 * VersionsPage, etc.).
 */
import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
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

export type WorkflowAction = 'soumettre' | 'valider' | 'rejeter' | 'publier';

interface ActionConfig {
  title: string;
  description: string;
  confirmLabel: string;
  variant: 'default' | 'destructive' | 'outline';
  commentaireRequired: boolean;
  commentairePlaceholder: string;
}

const ACTION_CONFIG: Record<WorkflowAction, ActionConfig> = {
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

async function executeAction(
  action: WorkflowAction,
  versionId: string,
  trimmed: string,
): Promise<Version> {
  switch (action) {
    case 'soumettre':
      return soumettreVersion(versionId, {
        commentaire: trimmed || undefined,
      });
    case 'valider':
      return validerVersion(versionId, {
        commentaire: trimmed || undefined,
      });
    case 'rejeter':
      return rejeterVersion(versionId, { commentaire: trimmed });
    case 'publier':
      return publierVersion(versionId, {
        commentaire: trimmed || undefined,
      });
  }
}

function successToastMessage(
  action: WorkflowAction,
  codeVersion: string,
): string {
  switch (action) {
    case 'soumettre':
      return `Version ${codeVersion} soumise à validation.`;
    case 'valider':
      return `Version ${codeVersion} validée.`;
    case 'rejeter':
      return `Version ${codeVersion} rejetée — retour au préparateur.`;
    case 'publier':
      return `Version ${codeVersion} publiée (gel BCEAO).`;
  }
}

interface WorkflowActionDialogProps {
  version: Version;
  /** `null` = modale fermée. Sinon = action à confirmer. */
  action: WorkflowAction | null;
  /** Appelé quand l'utilisateur annule (clique Annuler ou ferme la modale). */
  onClose: () => void;
  /** Appelé après transition API réussie, avec la version mise à jour. */
  onTransitioned: (next: Version) => void;
}

export function WorkflowActionDialog({
  version,
  action,
  onClose,
  onTransitioned,
}: WorkflowActionDialogProps): JSX.Element {
  const [commentaire, setCommentaire] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (action !== null) setCommentaire('');
  }, [action]);

  function handleOpenChange(open: boolean): void {
    if (!open && !submitting) onClose();
  }

  function handleCancel(): void {
    if (submitting) return;
    onClose();
  }

  async function handleConfirm(): Promise<void> {
    if (!action) return;
    const config = ACTION_CONFIG[action];
    const trimmed = commentaire.trim();
    if (config.commentaireRequired && !trimmed) {
      toast.error('Le commentaire de rejet est obligatoire.');
      return;
    }
    setSubmitting(true);
    try {
      const next = await executeAction(action, version.id, trimmed);
      toast.success(successToastMessage(action, version.codeVersion));
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

  const config = action ? ACTION_CONFIG[action] : null;

  return (
    <Dialog open={action !== null} onOpenChange={handleOpenChange}>
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
              onClick={handleCancel}
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
  );
}
