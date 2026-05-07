/**
 * ModifierUserDialog (Lot Administration ADMIN.A) — édition des champs
 * nom/prenom/email d'un user. Le mot de passe est géré séparément.
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { modifierUser } from '@/lib/api/users';
import type { UserResponse } from '@/lib/api/types';

interface ModifierUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserResponse | null;
  onUpdated: () => void;
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

export function ModifierUserDialog({
  isOpen,
  onClose,
  user,
  onUpdated,
}: ModifierUserDialogProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setEmail(user.email);
      setNom(user.nom);
      setPrenom(user.prenom);
    }
  }, [user, isOpen]);

  async function handleSubmit(): Promise<void> {
    if (!user) return;
    setSubmitting(true);
    try {
      await modifierUser(user.id, { email, nom, prenom });
      toast.success('Utilisateur modifié.');
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(`Modification refusée : ${parseError(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l'utilisateur</DialogTitle>
          <DialogDescription>
            Édition des informations principales. Le mot de passe est
            réinitialisable depuis le menu d'actions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="mu-email">Email</Label>
            <Input
              id="mu-email"
              data-testid="mu-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="mu-prenom">Prénom</Label>
              <Input
                id="mu-prenom"
                data-testid="mu-prenom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="mu-nom">Nom</Label>
              <Input
                id="mu-nom"
                data-testid="mu-nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            data-testid="btn-modifier-user"
          >
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
