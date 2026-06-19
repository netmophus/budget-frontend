/**
 * RetirerCrDialog — retrait d'un CR du snapshot des CR attendus
 * (action Coordinateur, motif obligatoire). Tracé en audit côté backend
 * (RETIRER_CR_SNAPSHOT).
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

const MOTIF_MAX = 500;

interface RetirerCrDialogProps {
  /** Code du CR à retirer (null = fermé). */
  crCode: string | null;
  onClose: () => void;
  /** Appelée au clic Confirmer ; throw → la modale reste ouverte. */
  onConfirm: (motif: string) => void | Promise<void>;
}

export function RetirerCrDialog({
  crCode,
  onClose,
  onConfirm,
}: RetirerCrDialogProps): JSX.Element | null {
  const [motif, setMotif] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!crCode) return null;

  async function handleConfirm(): Promise<void> {
    setSubmitting(true);
    try {
      await onConfirm(motif.trim());
      setMotif('');
      onClose();
    } catch {
      // toast géré par le caller.
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose(): void {
    setMotif('');
    onClose();
  }

  return (
    <Dialog
      open={crCode !== null}
      onOpenChange={(o) => !o && !submitting && handleClose()}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Retirer le CR <span className="font-mono">{crCode}</span> du snapshot
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-(--muted-foreground)">
              Motif du retrait (obligatoire)
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="retirer-motif" className="sr-only">
              Motif
            </Label>
            <textarea
              id="retirer-motif"
              data-testid="retirer-motif"
              value={motif}
              onChange={(e) => setMotif(e.target.value.slice(0, MOTIF_MAX))}
              rows={3}
              maxLength={MOTIF_MAX}
              className="w-full rounded-md border border-(--border) bg-white p-2 text-sm"
              placeholder="Ex. CR sans activité budgétaire cette année…"
            />
            <div className="text-[11px] text-(--muted-foreground) text-right mt-0.5">
              {motif.length}/{MOTIF_MAX}
            </div>
          </div>
          <div className="rounded-md border border-(--miznas-ambre)/40 bg-(--miznas-ambre)/5 px-3 py-2 text-xs">
            ⚠ Ce CR ne sera plus attendu pour la validation globale de la
            version (il sort du dénominateur « X/Y validés »).
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={submitting || motif.trim().length === 0}
            data-testid="retirer-confirmer"
          >
            {submitting ? '…' : 'Retirer du snapshot'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
