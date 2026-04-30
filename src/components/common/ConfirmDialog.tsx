import { type ReactNode, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface ConfirmDialogProps {
  /** Contrôle l'ouverture. */
  isOpen: boolean;
  /** Callback de fermeture (annulation OU confirmation réussie). */
  onClose: () => void;
  /** Action à exécuter au clic Confirmer. Si elle throw, le dialog reste ouvert. */
  onConfirm: () => void | Promise<void>;
  /** Titre court. */
  title: string;
  /** Description (string ou JSX libre). */
  description: ReactNode;
  /** Texte du bouton Confirmer. Défaut "Confirmer". */
  confirmText?: string;
  /** Texte du bouton Annuler. Défaut "Annuler". */
  cancelText?: string;
  /** Si true, le bouton Confirmer est rouge (variant destructive). */
  destructive?: boolean;
}

/**
 * Dialogue de confirmation générique — réutilisable pour toutes les
 * actions destructives (désactivation SCD2, suppression scénario,
 * gel version, etc.).
 *
 * Le bouton Confirmer accepte une promesse : pendant l'exécution il
 * passe en état loading. Si la promesse rejette, le dialog reste
 * ouvert (le caller affiche un toast d'erreur).
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  destructive = false,
}: ConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Laisser le caller gérer le toast — on garde le dialog ouvert.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-(--muted-foreground) whitespace-pre-line">
              {description}
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {cancelText}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? '…' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
