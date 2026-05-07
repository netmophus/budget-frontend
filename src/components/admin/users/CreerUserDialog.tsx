/**
 * CreerUserDialog (Lot Administration ADMIN.A) — création d'un user
 * avec mot de passe initial + multi-select des rôles.
 */
import { AxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
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
import { listRoles } from '@/lib/api/roles';
import type { RoleResponse } from '@/lib/api/types';
import { creerUser } from '@/lib/api/users';

interface CreerUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
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

export function CreerUserDialog({
  isOpen,
  onClose,
  onCreated,
}: CreerUserDialogProps): JSX.Element {
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [email, setEmail] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [mdp, setMdp] = useState('');
  const [fkRoles, setFkRoles] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    listRoles()
      .then((r) => setRoles(r.filter((x) => x.estActif)))
      .catch(() => toast.error('Impossible de charger les rôles.'));
  }, [isOpen]);

  function reset(): void {
    setEmail('');
    setNom('');
    setPrenom('');
    setMdp('');
    setFkRoles([]);
  }

  function toggleRole(id: string): void {
    setFkRoles((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const peutCreer = useMemo(() => {
    return (
      emailValide &&
      nom.trim().length >= 2 &&
      prenom.trim().length >= 2 &&
      mdp.length >= 12 &&
      fkRoles.length >= 1
    );
  }, [emailValide, nom, prenom, mdp, fkRoles]);

  async function handleSubmit(): Promise<void> {
    if (!peutCreer) return;
    setSubmitting(true);
    try {
      await creerUser({
        email: email.trim(),
        nom: nom.trim(),
        prenom: prenom.trim(),
        motDePasseInitial: mdp,
        fkRoles,
      });
      toast.success('Utilisateur créé.');
      reset();
      onCreated();
      onClose();
    } catch (err) {
      toast.error(`Création refusée : ${parseError(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel utilisateur</DialogTitle>
          <DialogDescription>
            Le user devra changer son mot de passe à la première connexion (à
            communiquer de manière sécurisée).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="cu-email">Email *</Label>
            <Input
              id="cu-email"
              data-testid="cu-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@miznas.local"
            />
            {email.length > 0 && !emailValide && (
              <p className="text-xs text-red-500 mt-1">Email invalide.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cu-prenom">Prénom *</Label>
              <Input
                id="cu-prenom"
                data-testid="cu-prenom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cu-nom">Nom *</Label>
              <Input
                id="cu-nom"
                data-testid="cu-nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="cu-mdp">Mot de passe initial *</Label>
            <Input
              id="cu-mdp"
              data-testid="cu-mdp"
              type="password"
              value={mdp}
              onChange={(e) => setMdp(e.target.value)}
              placeholder="≥ 12 caractères"
            />
            {mdp.length > 0 && mdp.length < 12 && (
              <p className="text-xs text-red-500 mt-1">
                Minimum 12 caractères.
              </p>
            )}
          </div>
          <div>
            <Label>Rôles *</Label>
            <div
              className="flex flex-col gap-1 mt-1 max-h-40 overflow-y-auto rounded-md border border-(--border) p-2"
              data-testid="cu-roles"
            >
              {roles.map((r) => (
                <label
                  key={r.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={fkRoles.includes(r.id)}
                    onChange={() => toggleRole(r.id)}
                    data-testid={`cu-role-${r.codeRole}`}
                  />
                  <span className="font-medium">{r.codeRole}</span>
                  <span className="text-xs text-(--muted-foreground)">
                    — {r.libelle}
                  </span>
                </label>
              ))}
            </div>
            {fkRoles.length === 0 && (
              <p className="text-xs text-(--muted-foreground) mt-1">
                Au moins un rôle doit être sélectionné.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!peutCreer || submitting}
            data-testid="btn-creer-user"
          >
            {submitting ? 'Création…' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
