/**
 * DemanderRevisionDialog — le Comité renvoie un CR validé en révision
 * (version SOUMIS_COMITE → OUVERT + CR ciblé VALIDE → EN_SAISIE).
 *
 * Sélection du CR à rouvrir (parmi les CR validés) + motif obligatoire
 * + avertissement explicite sur l'effet (version réouverte).
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
import type { CrStatutLigne } from '@/lib/api/cr-workflow';

const MOTIF_MAX = 500;

interface DemanderRevisionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** CR validés candidats à la révision. */
  crs: CrStatutLigne[];
  onConfirm: (crCode: string, motif: string) => void | Promise<void>;
  submitting: boolean;
}

export function DemanderRevisionDialog({
  isOpen,
  onClose,
  crs,
  onConfirm,
  submitting,
}: DemanderRevisionDialogProps): JSX.Element {
  const [crCode, setCrCode] = useState('');
  const [motif, setMotif] = useState('');

  function reset(): void {
    setCrCode('');
    setMotif('');
  }

  function handleClose(): void {
    reset();
    onClose();
  }

  async function handleConfirm(): Promise<void> {
    try {
      await onConfirm(crCode, motif.trim());
      reset();
    } catch {
      // toast géré par le caller.
    }
  }

  const valide = crCode !== '' && motif.trim().length > 0;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(o) => !o && !submitting && handleClose()}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Demander une révision</DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-(--muted-foreground)">
              Renvoyer un CR au saisisseur pour correction.
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="revision-cr" className="text-xs mb-1 block">
              CR à rouvrir
            </Label>
            <select
              id="revision-cr"
              data-testid="revision-cr"
              value={crCode}
              onChange={(e) => setCrCode(e.target.value)}
              className="w-full h-9 rounded-md border border-(--border) bg-white px-2 text-sm"
            >
              <option value="">— Sélectionner un CR —</option>
              {crs.map((c) => (
                <option key={c.crId} value={c.crCode}>
                  {c.crCode} — {c.libelle}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="revision-motif" className="text-xs mb-1 block">
              Motif (obligatoire)
            </Label>
            <textarea
              id="revision-motif"
              data-testid="revision-motif"
              value={motif}
              onChange={(e) => setMotif(e.target.value.slice(0, MOTIF_MAX))}
              rows={3}
              maxLength={MOTIF_MAX}
              className="w-full rounded-md border border-(--border) bg-white p-2 text-sm"
              placeholder="Ex. Revoir l’hypothèse PNB cl.7 (cadrage Holding)…"
            />
            <div className="text-[11px] text-(--muted-foreground) text-right mt-0.5">
              {motif.length}/{MOTIF_MAX}
            </div>
          </div>

          <div className="rounded-md border border-(--miznas-ambre)/40 bg-(--miznas-ambre)/5 px-3 py-2 text-xs">
            ⚠ <strong>La version repassera en «&nbsp;Ouvert&nbsp;»</strong> et le
            CR ciblé en «&nbsp;En saisie&nbsp;» pour correction. Le saisisseur et
            le validateur du CR seront notifiés.
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={submitting || !valide}
            data-testid="revision-confirmer"
          >
            {submitting ? 'Envoi…' : 'Demander la révision'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
