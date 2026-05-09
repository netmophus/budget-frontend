/**
 * ResetPasswordDialog (Lot Administration ADMIN.A) — confirmation
 * du reset password admin.
 *
 * Lot 6.4.C — refactor : la réponse API ne retourne PLUS le mdp en
 * clair (le mdp est envoyé par email à l'utilisateur via la queue
 * BullMQ Lot 6.3 + reset-password-admin.hbs). Le dialog affiche
 * désormais juste un toast + message de confirmation, et se ferme
 * après le reset.
 */
import { AxiosError } from 'axios';
import { Mail } from 'lucide-react';
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
import { resetPasswordUser } from '@/lib/api/users';
import type { UserResponse } from '@/lib/api/types';

interface ResetPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserResponse | null;
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

export function ResetPasswordDialog({
  isOpen,
  onClose,
  user,
}: ResetPasswordDialogProps) {
  const [emailEnvoye, setEmailEnvoye] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirmer(): Promise<void> {
    if (!user) return;
    setSubmitting(true);
    try {
      await resetPasswordUser(user.id);
      setEmailEnvoye(user.email);
      toast.success(`Email de réinitialisation envoyé à ${user.email}.`);
    } catch (err) {
      toast.error(`Refusé : ${parseError(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose(): void {
    setEmailEnvoye(null);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
          <DialogDescription>
            {user && (
              <>
                Cible : <strong>{user.email}</strong>. Un mot de passe
                temporaire sera envoyé par email à l'utilisateur — il devra
                le changer à sa prochaine connexion.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!emailEnvoye ? (
          <div className="space-y-3">
            <p className="text-sm">
              Cette action est irréversible et invalide le mot de passe
              actuel. L'ancien mot de passe ne sera plus utilisable.
            </p>
            <p className="text-xs text-(--muted-foreground)">
              Lot 6.4.C — le mot de passe en clair n'est plus affiché à
              l'admin : il est envoyé directement par email au destinataire
              et expire dans 7 jours.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={submitting}>
                Annuler
              </Button>
              <Button
                onClick={handleConfirmer}
                disabled={submitting}
                data-testid="btn-confirmer-reset"
              >
                {submitting ? 'Envoi…' : 'Réinitialiser et envoyer'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3" data-testid="reset-confirmation">
            <div className="flex items-start gap-3 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm">
              <Mail className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-emerald-900">
                  Email envoyé à <strong>{emailEnvoye}</strong>
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  L'utilisateur recevra un mot de passe temporaire et devra
                  le remplacer dès sa prochaine connexion. Validité : 7 jours.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Fermer</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
