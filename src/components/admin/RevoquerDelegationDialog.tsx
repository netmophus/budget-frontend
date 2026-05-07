/**
 * RevoquerDelegationDialog (Lot 4.2.C) — confirmation de révocation
 * d'une délégation. Demande un motif obligatoire (≥ 3 caractères).
 *
 * Action irréversible : la délégation passe à actif=false côté
 * backend, les périmètres miroirs sont désactivés et un audit
 * REVOQUER_DELEGATION est généré.
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
  type Delegation,
  revoquerDelegation,
} from '@/lib/api/delegations';

interface RevoquerDelegationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  delegation: Delegation | null;
  onRevoked: () => void;
}

function parseError(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    return Array.isArray(data?.message)
      ? data!.message.join(' ; ')
      : (data?.message ?? err.message);
  }
  return err instanceof Error ? err.message : 'Erreur';
}

export function RevoquerDelegationDialog({
  isOpen,
  onClose,
  delegation,
  onRevoked,
}: RevoquerDelegationDialogProps): JSX.Element {
  const [motif, setMotif] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setMotif('');
  }, [isOpen]);

  const motifValide = motif.trim().length >= 3;

  async function handleConfirmer(): Promise<void> {
    if (!delegation || !motifValide) return;
    setSubmitting(true);
    try {
      await revoquerDelegation(delegation.id, { motif: motif.trim() });
      toast.success('Délégation révoquée.');
      onRevoked();
      onClose();
    } catch (err) {
      toast.error(`Révocation refusée : ${parseError(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Révoquer la délégation</DialogTitle>
          <DialogDescription>
            Action irréversible — les périmètres délégués seront
            immédiatement retirés du délégataire et un journal d'audit
            sera généré.
          </DialogDescription>
        </DialogHeader>

        {delegation && (
          <div className="rounded-md border border-(--border) p-3 text-sm space-y-1">
            <div>
              <span className="text-(--muted-foreground)">Délégataire : </span>
              <strong data-testid="revoq-delegataire">
                {delegation.delegataireEmail ?? delegation.fkDelegataire}
              </strong>
            </div>
            <div>
              <span className="text-(--muted-foreground)">Permissions : </span>
              {delegation.permissions.join(', ')}
            </div>
            <div>
              <span className="text-(--muted-foreground)">Période : </span>
              {delegation.dateDebut} → {delegation.dateFin}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="motif-revocation">
            Motif de révocation <span className="text-red-500">*</span>
          </Label>
          <textarea
            id="motif-revocation"
            data-testid="motif-revocation"
            className="w-full rounded-md border border-(--border) bg-(--background) p-2 text-sm"
            rows={3}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Au moins 3 caractères. Ex : Retour anticipé du délégataire."
          />
          {motif.length > 0 && !motifValide && (
            <p className="text-xs text-red-500">
              Le motif doit contenir au moins 3 caractères.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            data-testid="btn-confirmer-revocation"
            onClick={handleConfirmer}
            disabled={!motifValide || submitting}
          >
            {submitting ? 'Révocation…' : 'Révoquer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
