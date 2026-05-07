/**
 * ResetPasswordDialog (Lot Administration ADMIN.A) — confirmation +
 * affichage UNIQUE du mot de passe temporaire généré côté serveur.
 */
import { AxiosError } from 'axios';
import { Copy } from 'lucide-react';
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
}: ResetPasswordDialogProps): JSX.Element {
  const [mdpGenere, setMdpGenere] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirmer(): Promise<void> {
    if (!user) return;
    setSubmitting(true);
    try {
      const r = await resetPasswordUser(user.id);
      setMdpGenere(r.motDePasseTemporaire);
      toast.success('Mot de passe temporaire généré.');
    } catch (err) {
      toast.error(`Refusé : ${parseError(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopier(): Promise<void> {
    if (!mdpGenere) return;
    try {
      await navigator.clipboard.writeText(mdpGenere);
      toast.success('Mot de passe copié.');
    } catch {
      toast.error('Copie impossible (autorisations navigateur).');
    }
  }

  function handleClose(): void {
    setMdpGenere(null);
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
                Cible : <strong>{user.email}</strong>. Le user devra utiliser
                ce nouveau mot de passe à sa prochaine connexion.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!mdpGenere ? (
          <div className="space-y-3">
            <p className="text-sm">
              Cette action est irréversible et invalide le mot de passe
              actuel. L'ancien mot de passe ne sera plus utilisable.
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
                {submitting ? 'Génération…' : 'Réinitialiser'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm bg-amber-50 border-l-3 border-amber-300 p-3">
              Communiquez ce mot de passe à l'utilisateur de manière
              sécurisée. <strong>Il ne sera plus affiché.</strong>
            </p>
            <div
              className="rounded-md border border-(--border) bg-(--muted)/50 px-3 py-2 font-mono text-base text-center break-all"
              data-testid="mdp-genere"
            >
              {mdpGenere}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCopier}
                data-testid="btn-copier-mdp"
              >
                <Copy className="h-4 w-4" />
                Copier
              </Button>
              <Button onClick={handleClose}>Fermer</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
