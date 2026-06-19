/**
 * ApprobationDialog — approbation d'une version par le Comité Budget
 * (SOUMIS_COMITE → VALIDE). Commentaire optionnel + rappel de
 * collégialité (décision du Comité, pas d'un membre isolé).
 */
import { useState } from 'react';

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

const COMMENT_MAX = 500;

interface ApprobationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (commentaire?: string) => void | Promise<void>;
  /** Libellé/code de la version approuvée (affichage). */
  versionLibelle?: string | null;
  submitting: boolean;
}

export function ApprobationDialog({
  isOpen,
  onClose,
  onConfirm,
  versionLibelle,
  submitting,
}: ApprobationDialogProps): JSX.Element {
  const [commentaire, setCommentaire] = useState('');

  async function handleConfirm(): Promise<void> {
    try {
      await onConfirm(commentaire.trim() || undefined);
      setCommentaire('');
    } catch {
      // toast géré par le caller.
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Approuver le budget</DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-(--muted-foreground)">
              {versionLibelle
                ? `Version « ${versionLibelle} ».`
                : 'Approbation de la version soumise.'}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border border-(--miznas-bleu-nuit-dark)/30 bg-(--miznas-bleu-nuit-dark)/5 px-3 py-2 text-xs">
            👥 <strong>Décision collégiale.</strong> Cette approbation engage le
            Comité Budget dans son ensemble. La version passera au statut
            «&nbsp;Validé&nbsp;» et pourra être publiée.
          </div>

          <div>
            <Label htmlFor="approbation-commentaire" className="text-xs mb-1 block">
              Commentaire (optionnel)
            </Label>
            <textarea
              id="approbation-commentaire"
              data-testid="approbation-commentaire"
              value={commentaire}
              onChange={(e) =>
                setCommentaire(e.target.value.slice(0, COMMENT_MAX))
              }
              rows={3}
              maxLength={COMMENT_MAX}
              className="w-full rounded-md border border-(--border) bg-white p-2 text-sm"
              placeholder="Ex. Budget approuvé en séance du Comité…"
            />
            <div className="text-[11px] text-(--muted-foreground) text-right mt-0.5">
              {commentaire.length}/{COMMENT_MAX}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting}
            data-testid="approbation-confirmer"
            className="bg-green-700 hover:bg-green-700/90 text-white"
          >
            {submitting ? 'Approbation…' : 'Approuver le budget'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
