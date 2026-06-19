/**
 * ValidationDialog — modale d'action du validateur sur un CR :
 * valider (commentaire optionnel), rejeter (motif obligatoire) ou
 * rouvrir (motif obligatoire). Le texte saisi est passé au caller.
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

export type ValidationAction = 'valider' | 'rejeter' | 'rouvrir';

const CONFIG: Record<
  ValidationAction,
  {
    titre: string;
    label: string;
    confirmer: string;
    obligatoire: boolean;
    maxLength: number;
    placeholder: string;
    avertissement: string | null;
    destructive: boolean;
  }
> = {
  valider: {
    titre: 'Valider le CR',
    label: 'Commentaire (optionnel)',
    confirmer: 'Confirmer la validation',
    obligatoire: false,
    maxLength: 250,
    placeholder: 'Remarque pour le saisisseur…',
    avertissement: null,
    destructive: false,
  },
  rejeter: {
    titre: 'Rejeter le CR',
    label: 'Motif du rejet (obligatoire)',
    confirmer: 'Confirmer le rejet',
    obligatoire: true,
    maxLength: 500,
    placeholder: 'Expliquez ce qui doit être corrigé…',
    avertissement:
      'Le saisisseur sera notifié et le CR repassera en « En cours de saisie ».',
    destructive: true,
  },
  rouvrir: {
    titre: 'Rouvrir le CR',
    label: 'Motif de la réouverture (obligatoire)',
    confirmer: 'Confirmer la réouverture',
    obligatoire: true,
    maxLength: 500,
    placeholder: 'Raison de la réouverture…',
    avertissement:
      'La version repassera en « Ouvert » si elle était en pré-validation.',
    destructive: true,
  },
};

interface ValidationDialogProps {
  action: ValidationAction | null;
  crCode: string | null;
  onClose: () => void;
  /** Appelée au clic Confirmer ; throw → la modale reste ouverte. */
  onConfirm: (texte: string) => void | Promise<void>;
}

export function ValidationDialog({
  action,
  crCode,
  onClose,
  onConfirm,
}: ValidationDialogProps): JSX.Element | null {
  const [texte, setTexte] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!action) return null;
  const cfg = CONFIG[action];
  const valide = !cfg.obligatoire || texte.trim().length > 0;

  async function handleConfirm(): Promise<void> {
    setSubmitting(true);
    try {
      await onConfirm(texte.trim());
      setTexte('');
      onClose();
    } catch {
      // Le caller affiche le toast ; on garde la modale ouverte.
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose(): void {
    setTexte('');
    onClose();
  }

  return (
    <Dialog
      open={action !== null}
      onOpenChange={(o) => !o && !submitting && handleClose()}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {cfg.titre} {crCode && <span className="font-mono">{crCode}</span>}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-(--muted-foreground)">
              {cfg.label}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="validation-texte" className="sr-only">
              {cfg.label}
            </Label>
            <textarea
              id="validation-texte"
              data-testid="validation-texte"
              value={texte}
              onChange={(e) => setTexte(e.target.value.slice(0, cfg.maxLength))}
              rows={3}
              maxLength={cfg.maxLength}
              className="w-full rounded-md border border-(--border) bg-white p-2 text-sm"
              placeholder={cfg.placeholder}
            />
            <div className="text-[11px] text-(--muted-foreground) text-right mt-0.5">
              {texte.length}/{cfg.maxLength}
            </div>
          </div>

          {cfg.avertissement && (
            <div
              className="rounded-md border border-(--miznas-ambre)/40 bg-(--miznas-ambre)/5 px-3 py-2 text-xs"
              data-testid="validation-avertissement"
            >
              ⚠ {cfg.avertissement}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            variant={cfg.destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={submitting || !valide}
            data-testid="validation-confirmer"
          >
            {submitting ? '…' : cfg.confirmer}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
