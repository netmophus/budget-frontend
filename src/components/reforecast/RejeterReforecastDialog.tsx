/**
 * Dialogue de rejet d'un reforecast soumis (Lot 5.3.B). Motif
 * obligatoire (≥ 5 caractères côté UI, validation backend stricte
 * en supplément).
 */
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
import { rejeterReforecast } from '@/lib/api/reforecast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reforecastId: string;
  reforecastLibelle: string;
  onRejected: () => void;
}

export function RejeterReforecastDialog({
  isOpen,
  onClose,
  reforecastId,
  reforecastLibelle,
  onRejected,
}: Props): JSX.Element {
  const [motif, setMotif] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (motif.trim().length < 5) {
      toast.error('Le motif doit contenir au moins 5 caractères.');
      return;
    }
    setSubmitting(true);
    try {
      await rejeterReforecast(reforecastId, motif.trim());
      toast.success('Reforecast rejeté.');
      onRejected();
      onClose();
      setMotif('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Rejet refusé : ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeter le reforecast</DialogTitle>
          <DialogDescription>
            Le reforecast <strong>{reforecastLibelle}</strong> repassera en
            BROUILLON. Le motif est conservé en audit.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="rf-rejet-motif">Motif (obligatoire)</Label>
            <textarea
              id="rf-rejet-motif"
              data-testid="rf-rejet-motif"
              className="w-full rounded-md border border-(--border) bg-(--background) p-2 text-sm"
              rows={4}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex. Méthode d'extrapolation incorrecte pour la ligne RETAIL"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleSubmit()}
            disabled={submitting || motif.trim().length < 5}
            data-testid="rf-rejet-confirmer"
          >
            {submitting ? 'Rejet…' : 'Rejeter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
